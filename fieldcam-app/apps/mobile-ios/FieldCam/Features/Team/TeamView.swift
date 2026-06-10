import SwiftUI

struct Membership: Decodable, Identifiable {
    let id: String
    let company_id: String
    let user_id: String
    let role: String
    let status: String
    let user: User?
    let created_at: String
}

struct TeamService {
    static func fetchMembers() async throws -> [Membership] {
        try await APIClient.shared.get(Endpoints.members)
    }

    static func invite(email: String, role: String) async throws {
        struct Body: Encodable { let email: String; let role: String }
        struct InviteResponse: Decodable { let message: String; let membership_id: String }
        let _: InviteResponse = try await APIClient.shared.post(
            Endpoints.invite,
            body: Body(email: email, role: role)
        )
    }
}

struct TeamView: View {
    @State private var members: [Membership] = []
    @State private var isLoading = true
    @State private var inviteEmail = ""
    @State private var inviteRole = "field_user"
    @State private var isInviting = false
    @State private var errorMessage: String?

    private let roles: [(value: String, label: String)] = [
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("field_user", "Field User"),
        ("viewer", "Viewer"),
    ]

    var body: some View {
        List {
            Section {
                TextField("Email address", text: $inviteEmail)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)

                Picker("Role", selection: $inviteRole) {
                    ForEach(roles, id: \.value) { role in
                        Text(role.label).tag(role.value)
                    }
                }

                Button {
                    Task { await invite() }
                } label: {
                    HStack {
                        Spacer()
                        if isInviting {
                            ProgressView().controlSize(.small)
                        } else {
                            Label("Invite", systemImage: "person.badge.plus")
                                .font(.system(size: 15, weight: .medium))
                        }
                        Spacer()
                    }
                }
                .disabled(inviteEmail.isEmpty || isInviting)
            } header: {
                Text("Invite a team member")
            } footer: {
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }

            Section("\(members.count) member\(members.count == 1 ? "" : "s")") {
                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                } else {
                    ForEach(members) { member in
                        memberRow(member)
                    }
                }
            }
        }
        .navigationTitle("Team")
        .task { await load() }
        .refreshable { await load() }
    }

    private func memberRow(_ member: Membership) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.brandPrimary.opacity(0.12))
                    .frame(width: 36, height: 36)
                Text(initials(member))
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.brandPrimary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(member.user?.full_name ?? member.user?.email ?? "Unknown")
                    .font(.system(size: 14, weight: .medium))
                Text(member.user?.email ?? "")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if member.status == "invited" {
                Text("Invited")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.brandWarning)
            }

            Text(member.role.replacingOccurrences(of: "_", with: " "))
                .font(.system(size: 11, weight: .medium))
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(roleColor(member.role).opacity(0.1))
                .foregroundStyle(roleColor(member.role))
                .clipShape(Capsule())
        }
        .padding(.vertical, 2)
    }

    private func initials(_ member: Membership) -> String {
        if let name = member.user?.full_name, !name.isEmpty {
            return name.split(separator: " ").prefix(2).compactMap { $0.first.map(String.init) }.joined().uppercased()
        }
        return String(member.user?.email.prefix(1) ?? "?").uppercased()
    }

    private func roleColor(_ role: String) -> Color {
        switch role {
        case "owner": return .purple
        case "admin": return .brandPrimary
        case "manager": return .brandSuccess
        case "viewer": return .gray.opacity(0.7)
        default: return .gray
        }
    }

    private func load() async {
        do {
            members = try await TeamService.fetchMembers()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func invite() async {
        isInviting = true
        do {
            try await TeamService.invite(email: inviteEmail, role: inviteRole)
            inviteEmail = ""
            members = (try? await TeamService.fetchMembers()) ?? members
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isInviting = false
    }
}
