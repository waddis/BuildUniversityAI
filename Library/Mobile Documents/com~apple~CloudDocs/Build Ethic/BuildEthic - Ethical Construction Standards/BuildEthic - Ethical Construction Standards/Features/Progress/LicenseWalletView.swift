import SwiftUI

struct LicenseWalletView: View {
    @State private var licenses: [License] = []
    
    var body: some View {
        NavigationView {
            List {
                if licenses.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 50))
                            .foregroundColor(.gray)
                        
                        Text("No Licenses Yet")
                            .font(.headline)
                            .foregroundColor(.secondary)
                        
                        Text("Complete courses to earn licenses and certifications")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    ForEach(licenses) { license in
                        LicenseCardView(license: license)
                    }
                }
            }
            .navigationTitle("License Wallet")
            .task {
                loadLicenses()
            }
        }
    }
    
    private func loadLicenses() {
        // Mock data for now
        licenses = [
            License(
                id: "1",
                name: "OSHA 10-Hour Construction",
                state: "General",
                number: "OSH-2024-001",
                expiresOn: Calendar.current.date(byAdding: .year, value: 1, to: Date()) ?? Date(),
                status: .active
            ),
            License(
                id: "2", 
                name: "Basic Safety Fundamentals",
                state: "General",
                number: "BSF-2024-001",
                expiresOn: Calendar.current.date(byAdding: .year, value: 2, to: Date()) ?? Date(),
                status: .active
            )
        ]
    }
}

struct License: Identifiable {
    let id: String
    let name: String
    let state: String
    let number: String
    let expiresOn: Date
    let status: LicenseStatus
}

enum LicenseStatus: String, CaseIterable {
    case active, expired, pending
}

struct LicenseCardView: View {
    let license: License
    
    var isExpiringSoon: Bool {
        Calendar.current.dateComponents([.day], from: Date(), to: license.expiresOn).day ?? 0 < 30
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading) {
                    Text(license.name)
                        .font(.headline)
                    Text(license.state)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing) {
                    Text(license.number)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(license.expiresOn, style: .date)
                        .font(.caption)
                        .foregroundColor(isExpiringSoon ? .red : .secondary)
                }
            }
            
            HStack {
                Text(license.status.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(statusColor.opacity(0.2))
                    .foregroundColor(statusColor)
                    .clipShape(Capsule())
                
                Spacer()
                
                if isExpiringSoon {
                    Text("Expires Soon")
                        .font(.caption)
                        .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private var statusColor: Color {
        switch license.status {
        case .active: return .green
        case .expired: return .red
        case .pending: return .orange
        }
    }
}

