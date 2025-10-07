import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var session: AuthSession
    @State private var notificationsEnabled = true
    @State private var offlineModeEnabled = false
    @State private var showingPrivacyView = false
    
    var body: some View {
        NavigationView {
            List {
                Section("Profile") {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 40))
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading) {
                            Text(session.user?.name ?? "User")
                                .font(.headline)
                            Text(session.user?.role ?? "Student")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
                
                Section("Preferences") {
                    Toggle("Push Notifications", isOn: $notificationsEnabled)
                    Toggle("Offline Mode", isOn: $offlineModeEnabled)
                }
                
                Section("Learning") {
                    NavigationLink("Course Progress") {
                        Text("Course Progress View")
                    }
                    NavigationLink("Certificates") {
                        Text("Certificates View")
                    }
                }
                
                Section("Tools") {
                    NavigationLink("Field Calculators") {
                        Text("Calculator Settings")
                    }
                    NavigationLink("Checklists") {
                        Text("Checklist Templates")
                    }
                }
                
                Section("Privacy & Security") {
                    Button("Privacy Policy") {
                        showingPrivacyView = true
                    }
                    
                    NavigationLink("Data Export") {
                        Text("Export Your Data")
                    }
                    
                    NavigationLink("Delete Account") {
                        Text("Account Deletion")
                    }
                    .foregroundColor(.red)
                }
                
                Section("Support") {
                    NavigationLink("Help & FAQ") {
                        Text("Help Center")
                    }
                    
                    NavigationLink("Contact Support") {
                        Text("Contact Us")
                    }
                    
                    NavigationLink("About") {
                        AboutView()
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingPrivacyView) {
                PrivacyView()
            }
        }
    }
}

struct AboutView: View {
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Image(systemName: "hammer.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("Resolution Academy")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Version 1.0.0")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Mission")
                        .font(.headline)
                    
                    Text("Empower professional development through comprehensive education and practical tools.")
                        .font(.body)
                        .multilineTextAlignment(.leading)
                    
                    Text("Principle")
                        .font(.headline)
                        .padding(.top)
                    
                    Text("Excellence through education — skills, knowledge, and professional growth.")
                        .font(.body)
                        .multilineTextAlignment(.leading)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                Spacer()
            }
            .padding()
            .navigationTitle("About")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

