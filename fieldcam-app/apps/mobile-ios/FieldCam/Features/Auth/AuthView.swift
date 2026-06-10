import SwiftUI

// AuthView: dark-themed by design; app-wide UIUserInterfaceStyle is Light.
struct AuthView: View {
    enum Mode { case login, register }

    @EnvironmentObject var authVM: AuthViewModel
    @State private var mode: Mode = .login
    @State private var email = ""
    @State private var password = ""
    @State private var fullName = ""
    @State private var companyName = ""
    @State private var animateIn = false

    private var canSubmit: Bool {
        let credentialsFilled = !email.isEmpty && !password.isEmpty
        if mode == .register {
            return credentialsFilled && !fullName.isEmpty && !companyName.isEmpty
        }
        return credentialsFilled
    }

    var body: some View {
        ZStack {
            // Dark gradient background
            LinearGradient(
                colors: [Color(red: 0.04, green: 0.08, blue: 0.18), Color(red: 0.07, green: 0.14, blue: 0.32)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Logo
                VStack(spacing: 12) {
                    ZStack {
                        Circle()
                            .fill(.white.opacity(0.08))
                            .frame(width: 88, height: 88)
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 38, weight: .medium))
                            .foregroundStyle(.white)
                    }
                    .scaleEffect(animateIn ? 1 : 0.7)
                    .opacity(animateIn ? 1 : 0)

                    Text("fieldcam")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text(mode == .login ? "Sign in to your account" : "Create your account")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.55))
                }
                .padding(.bottom, 36)

                // Form
                VStack(spacing: 20) {
                    // Mode toggle
                    HStack(spacing: 8) {
                        modeButton("Sign In", .login)
                        modeButton("Register", .register)
                    }

                    VStack(spacing: 14) {
                        if mode == .register {
                            HStack(spacing: 12) {
                                Image(systemName: "person")
                                    .foregroundStyle(.white.opacity(0.45))
                                    .frame(width: 20)
                                TextField("", text: $fullName, prompt: Text("Full Name").foregroundStyle(.white.opacity(0.35)))
                                    .textContentType(.name)
                                    .foregroundStyle(.white)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(.white.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.1)))

                            HStack(spacing: 12) {
                                Image(systemName: "building.2")
                                    .foregroundStyle(.white.opacity(0.45))
                                    .frame(width: 20)
                                TextField("", text: $companyName, prompt: Text("Company Name").foregroundStyle(.white.opacity(0.35)))
                                    .textContentType(.organizationName)
                                    .foregroundStyle(.white)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                            .background(.white.opacity(0.07))
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.1)))
                        }

                        HStack(spacing: 12) {
                            Image(systemName: "envelope")
                                .foregroundStyle(.white.opacity(0.45))
                                .frame(width: 20)
                            TextField("", text: $email, prompt: Text("Email").foregroundStyle(.white.opacity(0.35)))
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .textInputAutocapitalization(.never)
                                .foregroundStyle(.white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(.white.opacity(0.07))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.1)))

                        HStack(spacing: 12) {
                            Image(systemName: "lock")
                                .foregroundStyle(.white.opacity(0.45))
                                .frame(width: 20)
                            SecureField("", text: $password, prompt: Text("Password").foregroundStyle(.white.opacity(0.35)))
                                .textContentType(.password)
                                .foregroundStyle(.white)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(.white.opacity(0.07))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(.white.opacity(0.1)))
                    }

                    if let error = authVM.errorMessage {
                        HStack(spacing: 6) {
                            Image(systemName: "exclamationmark.circle.fill").font(.caption)
                            Text(error).font(.caption)
                        }
                        .foregroundStyle(Color(red: 1, green: 0.4, blue: 0.4))
                        .padding(10)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.red.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }

                    Button {
                        Task {
                            if mode == .login {
                                await authVM.login(email: email, password: password)
                            } else {
                                await authVM.register(email: email, password: password, fullName: fullName, companyName: companyName)
                            }
                        }
                    } label: {
                        Group {
                            if authVM.isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text(mode == .login ? "Sign In" : "Create Account").fontWeight(.semibold)
                            }
                        }
                        .frame(maxWidth: .infinity, minHeight: 22)
                    }
                    .buttonStyle(.plain)
                    .padding(.vertical, 14)
                    .background(
                        LinearGradient(colors: [Color(red: 0.2, green: 0.45, blue: 1.0), Color(red: 0.25, green: 0.5, blue: 0.95)], startPoint: .leading, endPoint: .trailing)
                    )
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .disabled(!canSubmit || authVM.isLoading)
                    .opacity(canSubmit ? 1 : 0.5)

                    if mode == .login {
                        VStack(spacing: 2) {
                            Text("By signing in, you agree to our")
                                .foregroundStyle(.white.opacity(0.35))
                            HStack(spacing: 4) {
                                Link("Terms of Service", destination: URL(string: "https://fieldcam.app/terms")!)
                                Text("and").foregroundStyle(.white.opacity(0.35))
                                Link("Privacy Policy", destination: URL(string: "https://fieldcam.app/privacy")!)
                            }
                            .foregroundStyle(.white.opacity(0.6))
                        }
                        .font(.system(size: 11))
                        .multilineTextAlignment(.center)
                    }
                }
                .padding(.horizontal, 32)

                Spacer()

                // Demo
                VStack(spacing: 3) {
                    Text("DEMO ACCOUNT")
                        .font(.system(size: 9, weight: .semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.3))
                    Text("owner@fieldcam.app  /  password123")
                        .font(.system(size: 11))
                        .foregroundStyle(.white.opacity(0.25))
                }
                .padding(.bottom, 30)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) { animateIn = true }
        }
    }

    private func modeButton(_ title: String, _ target: Mode) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                mode = target
                authVM.errorMessage = nil
            }
        } label: {
            Text(title)
                .font(.system(size: 14, weight: .medium))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 10)
                .background(mode == target ? .white.opacity(0.12) : .clear)
                .foregroundStyle(mode == target ? .white : .white.opacity(0.45))
                .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
    }
}
