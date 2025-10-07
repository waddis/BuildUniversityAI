import SwiftUI

struct OnboardingView: View {
    @EnvironmentObject var session: AuthSession
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 16) {
                    Image(systemName: "hammer.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("Resolution Academy")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("Professional Development Platform")
                        .font(.headline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)
                
                VStack(spacing: 16) {
                    TextField("Email", text: $email)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                    
                    Button(action: signIn) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .scaleEffect(0.8)
                            }
                            Text("Sign In")
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                }
                .padding(.horizontal, 32)
                
                Spacer()
                
                VStack(spacing: 8) {
                    Text("Mission: Empower professional development")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                    
                    Text("Excellence through education — skills, knowledge, and professional growth")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.bottom, 20)
            }
        }
    }
    
    private func signIn() {
        Task {
            isLoading = true
            errorMessage = ""
            
            do {
                try await session.signIn(email: email, password: password)
            } catch {
                errorMessage = "Sign in failed. Please check your credentials."
            }
            
            isLoading = false
        }
    }
}

