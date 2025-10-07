import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: AuthSession
    
    var body: some View {
        Group {
            #if DEBUG
            // Skip authentication in development
            HomeView()
            #else
            switch session.state {
            case .unknown:
                // Show loading or onboarding while determining auth state
                VStack {
                    ProgressView("Loading...")
                    Text("Initializing Resolution Academy")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .onAppear {
                    initializeAuthState()
                }
            case .unauthenticated:
                OnboardingView()
            case .authenticated:
                HomeView()
            }
            #endif
        }
        .animation(.easeInOut, value: session.state)
    }
    
    private func initializeAuthState() {
        // Check if we have a stored token
        if let token = AuthSessionKeychain.shared.token, !token.isEmpty {
            session.token = token
        } else {
            session.state = .unauthenticated
        }
    }
}

