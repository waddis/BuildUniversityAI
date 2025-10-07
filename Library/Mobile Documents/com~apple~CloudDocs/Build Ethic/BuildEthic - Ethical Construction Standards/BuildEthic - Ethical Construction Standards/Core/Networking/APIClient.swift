import Foundation

final class APIClient {
    static let shared = APIClient()
    private init() {}
    
    let baseURL = URL(string: ProcessInfo.processInfo.environment["API_BASE_URL"] ?? "http://localhost:3000")!

    func get<T: Decodable>(_ path: String) async throws -> T {
        try await request(path, method: "GET", body: Optional<Data>.none)
    }

    func post<T: Decodable>(_ path: String, body: [String: Any]) async throws -> T {
        let data = try JSONSerialization.data(withJSONObject: body)
        return try await request(path, method: "POST", body: data)
    }

    private func request<T: Decodable>(_ path: String, method: String, body: Data?) async throws -> T {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.addValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = AuthSessionKeychain.shared.token { 
            req.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization") 
        }
        
        req.httpBody = body
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard (resp as? HTTPURLResponse)?.statusCode ?? 500 < 300 else { 
            throw URLError(.badServerResponse) 
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    func requestSCORMLaunch(courseId: String) async throws -> SCORMLaunchToken {
        guard let url = URL(string: baseURL.absoluteString + "/lms/launch?courseId=\(courseId)") else { 
            throw URLError(.badURL) 
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        if let token = AuthSessionKeychain.shared.token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        // Optionally attach DeviceCheck token
        let (data, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, http.statusCode >= 300 { 
            throw URLError(.badServerResponse) 
        }
        return try JSONDecoder().decode(SCORMLaunchToken.self, from: data)
    }
}

// Minimal Keychain wrapper
class AuthSessionKeychain { 
    static var shared = AuthSessionKeychain()
    private init() {}
    
    var token: String? { 
        get { UserDefaults.standard.string(forKey: "token") } 
        set { UserDefaults.standard.set(newValue, forKey: "token") } 
    } 
}

