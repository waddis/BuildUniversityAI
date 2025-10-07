import Foundation

final class XAPIClient {
    static let shared = XAPIClient()

    func send(statement: XAPIStatement, endpoint: URL, auth: String) async throws {
        var req = URLRequest(url: endpoint)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(auth)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(statement)
        let (_, resp) = try await URLSession.shared.data(for: req)
        if let http = resp as? HTTPURLResponse, http.statusCode >= 300 {
            throw NSError(domain: "xapi", code: http.statusCode, userInfo: nil)
        }
    }
}
