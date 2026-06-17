import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isLoading = true
    @Published var errorMessage: String?

    private let auth = AuthManager.shared

    init() {
        isAuthenticated = auth.isAuthenticated
        Task { await restoreSession() }
    }

    private func restoreSession() async {
        await auth.tryRestoreSession()
        isAuthenticated = auth.isAuthenticated
        isLoading = false
    }

    func login(email: String, password: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await auth.login(email: email, password: password)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func register(email: String, password: String, fullName: String, companyName: String) async {
        isLoading = true
        errorMessage = nil
        do {
            try await auth.register(email: email, password: password, fullName: fullName, companyName: companyName)
            isAuthenticated = true
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func logout() {
        auth.logout()
        isAuthenticated = false
    }
}
