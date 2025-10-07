import Combine
import Foundation

final class AuthSession: ObservableObject {
    enum State { 
        case unknown, unauthenticated, authenticated 
    }
    
    @Published var state: State = .unknown
    @Published var token: String? { 
        didSet { 
            state = token == nil ? .unauthenticated : .authenticated 
        } 
    }
    @Published var user: UserProfile?

    func signIn(email: String, password: String) async throws {
        let res: AuthResponse = try await APIClient.shared.post("/auth/login", body: ["email": email, "password": password])
        await MainActor.run {
            self.token = res.accessToken
            self.user = res.user
        }
    }
    
    func signOut() {
        token = nil
        user = nil
    }
}

struct AuthResponse: Decodable { 
    let accessToken: String
    let user: UserProfile 
}

struct UserProfile: Codable, Identifiable { 
    let id: String
    let name: String
    let role: String 
}

