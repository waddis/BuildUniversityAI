import SwiftUI
import Combine

final class AppSettings: ObservableObject {
    @Published var reduceMotion: Bool = false
    @Published var largeTapTargets: Bool = false
}

struct ProfileView: View {
    @StateObject private var settings = AppSettings()
    
    private var appVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Unknown"
    }
    
    private var buildNumber: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Unknown"
    }
    
    var body: some View {
        NavigationStack {
            List {
                // User Profile Section
                SwiftUI.Section {
                    HStack(spacing: 16) {
                        // Profile Avatar
                        Circle()
                            .fill(.blue.gradient)
                            .frame(width: 60, height: 60)
                            .overlay {
                                Image(systemName: "person.fill")
                                    .font(.title2)
                                    .foregroundColor(.white)
                            }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("John Doe")
                                .font(.headline)
                            Text("Claims Adjuster")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text("Resolution Claims Consulting")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Profile")
                }
                
                // Accessibility Settings
                SwiftUI.Section("Accessibility") {
                    Toggle("Reduce Motion", isOn: $settings.reduceMotion)
                    Toggle("Large Tap Targets", isOn: $settings.largeTapTargets)
                }
                
                // Data Management
                SwiftUI.Section("Data") {
                    Button(role: .destructive) {
                        // TODO: Implement data reset
                    } label: {
                        Label("Reset App Data", systemImage: "trash")
                    }
                }
                
                // App Information
                SwiftUI.Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(appVersion)
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack {
                        Text("Build")
                        Spacer()
                        Text(buildNumber)
                            .foregroundStyle(.secondary)
                    }
                    
                    HStack {
                        Text("Developer")
                        Spacer()
                        Text("Twelve Squared AI")
                            .foregroundStyle(.secondary)
                    }
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("About BuildUniversityAI")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        Text("An educational initiative by Resolution Claims Consulting to help adjusters learn construction assessment through AR technology.")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.vertical, 4)
                }
                
                // Support
                SwiftUI.Section("Support") {
                    Button {
                        // TODO: Implement feedback
                    } label: {
                        Label("Send Feedback", systemImage: "envelope")
                    }
                    
                    Button {
                        // TODO: Implement help
                    } label: {
                        Label("Help & Support", systemImage: "questionmark.circle")
                    }
                }
            }
            .navigationTitle("Profile")
        }
    }
}

#Preview {
    NavigationStack {
        ProfileView()
    }
}