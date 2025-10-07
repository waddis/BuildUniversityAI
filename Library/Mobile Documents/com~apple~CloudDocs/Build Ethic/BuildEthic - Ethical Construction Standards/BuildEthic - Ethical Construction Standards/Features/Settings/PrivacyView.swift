import SwiftUI

struct PrivacyView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var trackingConsent = false
    @State private var analyticsConsent = false
    @State private var showingATTAlert = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Your Privacy Matters")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("We are committed to protecting your privacy and being transparent about how we use your data.")
                            .font(.body)
                            .foregroundColor(.secondary)
                    }
                    
                    // Data Collection
                    VStack(alignment: .leading, spacing: 12) {
                        Text("What We Collect")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            PrivacyItem(
                                title: "Account Information",
                                description: "Name, email, and role for course access and progress tracking",
                                required: true
                            )
                            
                            PrivacyItem(
                                title: "Learning Progress",
                                description: "Course completion, CEU records, and skill assessments",
                                required: true
                            )
                            
                            PrivacyItem(
                                title: "Field Data",
                                description: "Checklists, photos, and project notes you choose to save",
                                required: false
                            )
                            
                            PrivacyItem(
                                title: "App Usage",
                                description: "Crash reports and performance data to improve the app",
                                required: false
                            )
                        }
                    }
                    
                    // Data Usage
                    VStack(alignment: .leading, spacing: 12) {
                        Text("How We Use Your Data")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("• Provide personalized learning experiences")
                            Text("• Track your progress and achievements")
                            Text("• Generate CEU certificates and transcripts")
                            Text("• Improve app functionality and reliability")
                            Text("• Comply with educational standards and regulations")
                        }
                        .font(.body)
                        .foregroundColor(.secondary)
                    }
                    
                    // Privacy Controls
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Your Controls")
                            .font(.headline)
                        
                        Toggle("Allow Learning Analytics", isOn: $analyticsConsent)
                            .toggleStyle(SwitchToggleStyle())
                        
                        Toggle("Allow Performance Tracking", isOn: $trackingConsent)
                            .toggleStyle(SwitchToggleStyle())
                        
                        Text("You can change these settings anytime in Settings > Privacy")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    // Key Principles
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Our Privacy Principles")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("✓ We never sell your personal data")
                            Text("✓ We minimize data collection to what's necessary")
                            Text("✓ We encrypt data in transit and at rest")
                            Text("✓ We provide data export and deletion options")
                            Text("✓ We comply with educational privacy standards")
                        }
                        .font(.body)
                        .foregroundColor(.secondary)
                    }
                    
                    // Contact
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Questions?")
                            .font(.headline)
                        
                        Text("Contact our privacy team at privacy@buildethic.app")
                            .font(.body)
                            .foregroundColor(.blue)
                    }
                }
                .padding()
            }
            .navigationTitle("Privacy Policy")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct PrivacyItem: View {
    let title: String
    let description: String
    let required: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: required ? "checkmark.circle.fill" : "circle")
                .foregroundColor(required ? .green : .gray)
                .font(.system(size: 16))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
    }
}

