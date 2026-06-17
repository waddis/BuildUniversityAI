import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authVM: AuthViewModel

    var body: some View {
        Group {
            if authVM.isLoading {
                VStack {
                    ProgressView()
                    Text("fieldcam")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                        .padding(.top, 8)
                }
            } else if authVM.isAuthenticated {
                MainTabView()
            } else {
                AuthView()
            }
        }
    }
}
