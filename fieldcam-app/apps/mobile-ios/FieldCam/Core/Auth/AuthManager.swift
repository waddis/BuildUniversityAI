import Foundation

@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    @Published var currentUser: User?
    @Published var isAuthenticated = false

    private init() {
        isAuthenticated = APIClient.shared.token != nil
    }

    struct LoginBody: Encodable {
        let email: String
        let password: String
    }

    struct LoginResponse: Decodable {
        let access_token: String
        let refresh_token: String
        let user: User
    }

    func login(email: String, password: String) async throws {
        let response: LoginResponse = try await APIClient.shared.post(
            Endpoints.login,
            body: LoginBody(email: email, password: password)
        )
        APIClient.shared.token = response.access_token
        APIClient.shared.refreshToken = response.refresh_token
        currentUser = response.user
        isAuthenticated = true
    }

    struct RegisterBody: Encodable {
        let email: String
        let password: String
        let full_name: String
        let company_name: String
    }

    func register(email: String, password: String, fullName: String, companyName: String) async throws {
        let response: LoginResponse = try await APIClient.shared.post(
            Endpoints.register,
            body: RegisterBody(email: email, password: password, full_name: fullName, company_name: companyName)
        )
        APIClient.shared.token = response.access_token
        APIClient.shared.refreshToken = response.refresh_token
        currentUser = response.user
        isAuthenticated = true
    }

    func logout() {
        APIClient.shared.token = nil
        APIClient.shared.refreshToken = nil
        currentUser = nil
        isAuthenticated = false
    }

    func fetchCurrentUser() async throws {
        let user: User = try await APIClient.shared.get(Endpoints.me)
        currentUser = user
        isAuthenticated = true
    }

    func tryRestoreSession() async {
        guard APIClient.shared.token != nil else { return }
        do {
            try await fetchCurrentUser()
        } catch APIError.serverError(401, _) {
            // Token rejected (and refresh failed) — the session is truly dead.
            logout()
        } catch {
            // Transient failure (offline, server down) — keep the session.
            isAuthenticated = true
        }
    }
}
