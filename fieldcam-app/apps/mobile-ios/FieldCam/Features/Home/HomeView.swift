import SwiftUI

struct HomeView: View {
    @State private var recentProjects: [Project] = []
    @State private var projectCount = 0
    @State private var mediaCount = 0
    @State private var openTaskCount = 0
    @State private var teamCount = 0
    @State private var isLoading = true
    @State private var showNotifications = false
    @State private var showCreate = false

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text("Welcome back to fieldcam.app")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)

                    LazyVGrid(columns: columns, spacing: 12) {
                        StatCard(label: "Projects", value: projectCount, icon: "folder", color: .brandPrimary, loading: isLoading)
                        StatCard(label: "Media", value: mediaCount, icon: "photo", color: .brandSuccess, loading: isLoading)
                        StatCard(label: "Open Tasks", value: openTaskCount, icon: "checkmark.square", color: .brandWarning, loading: isLoading)
                        StatCard(label: "Team", value: teamCount, icon: "person.2", color: .purple, loading: isLoading)
                    }

                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Projects")
                            .font(.system(size: 17, weight: .semibold))

                        if isLoading {
                            HStack {
                                Spacer()
                                ProgressView()
                                    .padding(.vertical, 32)
                                Spacer()
                            }
                        } else if recentProjects.isEmpty {
                            VStack(spacing: 12) {
                                Text("No projects yet.")
                                    .font(.system(size: 13))
                                    .foregroundStyle(.tertiary)
                                Button {
                                    showCreate = true
                                } label: {
                                    Text("Create Project")
                                        .font(.system(size: 13, weight: .medium))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(Color.brandPrimary)
                                        .foregroundStyle(.white)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 24)
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                        } else {
                            VStack(spacing: 0) {
                                ForEach(recentProjects) { project in
                                    NavigationLink(destination: ProjectDetailView(project: project)) {
                                        recentProjectRow(project)
                                    }
                                    .buttonStyle(.plain)

                                    if project.id != recentProjects.last?.id {
                                        Divider().padding(.leading, 16)
                                    }
                                }
                            }
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                            .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
                        }
                    }
                }
                .padding(16)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Dashboard")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showNotifications = true
                    } label: {
                        Image(systemName: "bell")
                    }
                }
            }
            .sheet(isPresented: $showNotifications) {
                NotificationsView()
            }
            .sheet(isPresented: $showCreate) {
                CreateProjectView { _ in Task { await load() } }
            }
            .task { await load() }
            .refreshable { await load() }
        }
    }

    private func recentProjectRow(_ project: Project) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(project.name)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(.primary)
                Text(subtitle(project))
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 4) {
                StatusPill(status: project.status)
                Text(relativeTime(project.updated_at))
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .contentShape(Rectangle())
    }

    private func subtitle(_ project: Project) -> String {
        let location = [project.city, project.state].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: ", ")
        if let claim = project.claim_number, !claim.isEmpty {
            return location.isEmpty ? claim : "\(location) — \(claim)"
        }
        return location
    }

    private func relativeTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let date else { return "" }
        return RelativeDateTimeFormatter().localizedString(for: date, relativeTo: Date())
    }

    private func load() async {
        do {
            async let projectsTask: ProjectListResponse = APIClient.shared.get(
                Endpoints.projects,
                query: [URLQueryItem(name: "page_size", value: "5")]
            )
            async let membersTask: [Membership] = APIClient.shared.get(Endpoints.members)

            let response = try await projectsTask
            recentProjects = response.items
            projectCount = response.total
            mediaCount = response.items.reduce(0) { $0 + ($1.media_count ?? 0) }
            teamCount = ((try? await membersTask) ?? []).count
        } catch {
            // API unreachable; keep last known values
        }
        isLoading = false
    }
}

private struct StatCard: View {
    let label: String
    let value: Int
    let icon: String
    let color: Color
    let loading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                Spacer()
                Image(systemName: icon)
                    .font(.system(size: 13))
                    .foregroundStyle(color)
                    .frame(width: 30, height: 30)
                    .background(color.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            Text(loading ? "—" : "\(value)")
                .font(.system(size: 24, weight: .bold))
                .foregroundStyle(.primary)
        }
        .padding(16)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 2)
    }
}
