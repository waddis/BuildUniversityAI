import SwiftUI

struct CompanyInfo: Decodable {
    let id: String
    let name: String
    let slug: String
    let created_at: String
}

struct SettingsView: View {
    @EnvironmentObject var authVM: AuthViewModel
    @StateObject private var reachability = Reachability.shared
    @StateObject private var uploadQueue = UploadQueue.shared
    @State private var showUploadQueue = false
    @State private var user: User?
    @State private var company: CompanyInfo?
    @State private var showDeleteConfirm = false
    @State private var deleteText = ""
    @State private var isDeleting = false
    @State private var deleteError: String?

    var body: some View {
        NavigationStack {
            List {
                // Profile card
                Section {
                    if let user {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(
                                        LinearGradient(colors: [Color.brandPrimary, Color.brandPrimary.opacity(0.7)], startPoint: .topLeading, endPoint: .bottomTrailing)
                                    )
                                    .frame(width: 52, height: 52)
                                Text(initials(user))
                                    .font(.system(size: 20, weight: .bold))
                                    .foregroundStyle(.white)
                            }
                            VStack(alignment: .leading, spacing: 3) {
                                Text(user.full_name ?? "User")
                                    .font(.system(size: 17, weight: .semibold))
                                Text(user.email)
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    } else {
                        HStack(spacing: 14) {
                            Circle().fill(.gray.opacity(0.15)).frame(width: 52, height: 52)
                            VStack(alignment: .leading, spacing: 3) {
                                RoundedRectangle(cornerRadius: 3).fill(.gray.opacity(0.15)).frame(width: 120, height: 14)
                                RoundedRectangle(cornerRadius: 3).fill(.gray.opacity(0.1)).frame(width: 160, height: 11)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Sync status
                Section("Sync") {
                    HStack {
                        Label("Connection", systemImage: "wifi")
                        Spacer()
                        HStack(spacing: 6) {
                            Circle()
                                .fill(reachability.isConnected ? Color.brandSuccess : Color.brandDanger)
                                .frame(width: 7, height: 7)
                            Text(reachability.isConnected ? "Online" : "Offline")
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        showUploadQueue = true
                    } label: {
                        HStack {
                            Label("Upload Queue", systemImage: "arrow.up.circle")
                                .foregroundStyle(.primary)
                            Spacer()
                            let pending = uploadQueue.pendingCount
                            if pending > 0 {
                                Text("\(pending) pending")
                                    .font(.system(size: 12, weight: .medium))
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 3)
                                    .background(Color.brandWarning.opacity(0.12))
                                    .foregroundStyle(Color.brandWarning)
                                    .clipShape(Capsule())
                            } else {
                                Text("All synced")
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(Color.brandSuccess)
                            }
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12))
                                .foregroundStyle(.quaternary)
                        }
                    }
                }

                // Workspace
                Section("Workspace") {
                    NavigationLink {
                        TeamView()
                    } label: {
                        Label("Team", systemImage: "person.2")
                    }
                }

                // Company
                Section("Company") {
                    HStack {
                        Label("Name", systemImage: "building.2")
                        Spacer()
                        Text(company?.name ?? "—")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Label("Slug", systemImage: "link")
                        Spacer()
                        Text(company?.slug ?? "—")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                }

                // App info
                Section("About") {
                    HStack {
                        Label("Version", systemImage: "info.circle")
                        Spacer()
                        Text("1.0.0")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Label("Build", systemImage: "hammer")
                        Spacer()
                        Text("1")
                            .font(.system(size: 13))
                            .foregroundStyle(.secondary)
                    }
                }

                // Data & Privacy
                Section {
                    Link(destination: URL(string: "mailto:privacy@fieldcam.app?subject=Data%20Export%20Request")!) {
                        Label("Request Data Export", systemImage: "square.and.arrow.up")
                            .foregroundStyle(.primary)
                    }
                    Button(role: .destructive) {
                        deleteText = ""
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete Account", systemImage: "trash")
                            .foregroundStyle(.red)
                    }
                } header: {
                    Text("Data & Privacy")
                } footer: {
                    if let deleteError {
                        Text(deleteError).foregroundStyle(.red)
                    } else {
                        Text("Deletion is permanent and removes all your projects, photos, and reports.")
                    }
                }

                // Sign out
                Section {
                    Button(role: .destructive) {
                        authVM.logout()
                    } label: {
                        HStack {
                            Spacer()
                            Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                                .font(.system(size: 15, weight: .medium))
                            Spacer()
                        }
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showUploadQueue) {
                UploadQueueView()
            }
            .alert("Delete Account?", isPresented: $showDeleteConfirm) {
                TextField("Type DELETE to confirm", text: $deleteText)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.characters)
                Button("Permanently Delete", role: .destructive) {
                    Task { await deleteAccount() }
                }
                .disabled(deleteText != "DELETE")
                Button("Cancel", role: .cancel) { deleteText = "" }
            } message: {
                Text("This will permanently delete your account and all associated data including projects, photos, and reports. This action cannot be undone.\n\nType DELETE to confirm.")
            }
            .task {
                do { user = try await APIClient.shared.get(Endpoints.me) } catch {}
                do { company = try await APIClient.shared.get(Endpoints.currentCompany) } catch {}
            }
        }
    }

    private func deleteAccount() async {
        guard deleteText == "DELETE" else { return }
        isDeleting = true
        do {
            try await APIClient.shared.delete(Endpoints.deleteMe)
            authVM.logout()
        } catch {
            deleteError = "Failed to delete account. Please contact privacy@fieldcam.app"
        }
        isDeleting = false
    }

    private func initials(_ user: User) -> String {
        if let name = user.full_name {
            return name.split(separator: " ").prefix(2).compactMap { $0.first.map(String.init) }.joined().uppercased()
        }
        return String(user.email.prefix(1)).uppercased()
    }
}
