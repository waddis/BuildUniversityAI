import Foundation

final class APIClient {
    static let shared = APIClient()

    let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder

    private init() {
        self.baseURL = APIClient.resolveBaseURL()
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
        self.decoder = JSONDecoder()
    }

    /// Info.plist "APIBaseURL" overrides per build config; otherwise localhost
    /// in Debug and the production host in Release.
    private static func resolveBaseURL() -> URL {
        if let configured = Bundle.main.object(forInfoDictionaryKey: "APIBaseURL") as? String,
           !configured.isEmpty,
           let url = URL(string: configured) {
            return url
        }
        #if DEBUG
        return URL(string: "http://localhost:8000/api/v1")!
        #else
        return URL(string: "https://api.fieldcam.app/api/v1")!
        #endif
    }

    var token: String? {
        get { UserDefaults.standard.string(forKey: "fieldcam_token") }
        set {
            if let newValue {
                UserDefaults.standard.set(newValue, forKey: "fieldcam_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "fieldcam_token")
            }
        }
    }

    var refreshToken: String? {
        get { UserDefaults.standard.string(forKey: "fieldcam_refresh_token") }
        set {
            if let newValue {
                UserDefaults.standard.set(newValue, forKey: "fieldcam_refresh_token")
            } else {
                UserDefaults.standard.removeObject(forKey: "fieldcam_refresh_token")
            }
        }
    }

    func get<T: Decodable>(_ path: String, query: [URLQueryItem]? = nil) async throws -> T {
        try await request(path, method: "GET", query: query)
    }

    func post<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(path, method: "POST", body: body)
    }

    func patch<T: Decodable>(_ path: String, body: (any Encodable)? = nil) async throws -> T {
        try await request(path, method: "PATCH", body: body)
    }

    func delete(_ path: String) async throws {
        let _: EmptyResponse = try await request(path, method: "DELETE")
    }

    func baseURLForAnnotation(mediaId: String) -> URL {
        baseURL.appendingPathComponent("media/\(mediaId)/annotations")
    }

    func uploadData(to url: URL, data: Data, contentType: String) async throws {
        var req = URLRequest(url: url)
        req.httpMethod = "PUT"
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")
        req.httpBody = data
        let (_, response) = try await session.data(for: req)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw APIError.httpError((response as? HTTPURLResponse)?.statusCode ?? 500)
        }
    }

    private struct RefreshResponse: Decodable {
        let access_token: String
        let refresh_token: String
    }

    /// Serializes refresh attempts: concurrent 401s (e.g. HomeView's parallel
    /// requests after token expiry) share one refresh call instead of racing.
    private actor RefreshCoordinator {
        private var inFlight: Task<Bool, Never>?

        func run(_ operation: @escaping () async -> Bool) async -> Bool {
            if let inFlight { return await inFlight.value }
            let task = Task { await operation() }
            inFlight = task
            let result = await task.value
            inFlight = nil
            return result
        }
    }

    private let refreshCoordinator = RefreshCoordinator()

    /// Exchange the stored refresh token for new tokens. Returns false if
    /// there is no refresh token or the server rejects it. A definitive
    /// rejection (401) is distinguished from transient failures by
    /// performRefresh clearing the refresh token only on rejection.
    private func refreshSession() async -> Bool {
        await refreshCoordinator.run { [weak self] in
            await self?.performRefresh() ?? false
        }
    }

    private func performRefresh() async -> Bool {
        guard let refreshToken else { return false }
        struct Body: Encodable { let refresh_token: String }
        do {
            let response: RefreshResponse = try await request(
                "auth/refresh", method: "POST",
                body: Body(refresh_token: refreshToken),
                allowRefresh: false
            )
            self.token = response.access_token
            self.refreshToken = response.refresh_token
            return true
        } catch APIError.serverError(401, _) {
            // The server rejected the refresh token — it is permanently dead.
            self.refreshToken = nil
            return false
        } catch {
            // Transient failure (offline, timeout) — keep the token for retry.
            return false
        }
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String,
        body: (any Encodable)? = nil,
        query: [URLQueryItem]? = nil,
        allowRefresh: Bool = true
    ) async throws -> T {
        var url = baseURL.appendingPathComponent(path)
        if let query, !query.isEmpty,
           var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.queryItems = query
            url = components.url ?? url
        }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            req.httpBody = try JSONEncoder().encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: req)

        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(http.statusCode) else {
            if http.statusCode == 401, allowRefresh,
               path != Endpoints.login, path != Endpoints.register,
               await refreshSession() {
                return try await request(path, method: method, body: body, query: query, allowRefresh: false)
            }
            let detail = try? decoder.decode(ErrorDetail.self, from: data)
            throw APIError.serverError(http.statusCode, detail?.detail ?? "Error \(http.statusCode)")
        }

        if data.isEmpty || http.statusCode == 204 {
            if let empty = EmptyResponse() as? T { return empty }
        }

        return try decoder.decode(T.self, from: data)
    }
}

struct EmptyResponse: Decodable {}
private struct ErrorDetail: Decodable { let detail: String }

enum APIError: LocalizedError {
    case invalidResponse
    case httpError(Int)
    case serverError(Int, String)

    var errorDescription: String? {
        switch self {
        case .invalidResponse: return "Invalid server response"
        case .httpError(let code): return "Server error (\(code))"
        case .serverError(_, let msg): return msg
        }
    }
}

private struct AnyEncodable: Encodable {
    private let _encode: (Encoder) throws -> Void
    init(_ wrapped: any Encodable) {
        _encode = { try wrapped.encode(to: $0) }
    }
    func encode(to encoder: Encoder) throws {
        try _encode(encoder)
    }
}
