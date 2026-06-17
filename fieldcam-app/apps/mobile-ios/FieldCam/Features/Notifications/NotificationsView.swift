import SwiftUI

struct NotificationItem: Decodable, Identifiable {
    let id: String
    let type: String
    let title: String
    let body: String?
    var read_at: String?
    let created_at: String

    var isRead: Bool { read_at != nil }
}

struct NotificationsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var notifications: [NotificationItem] = []
    @State private var isLoading = true

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if notifications.isEmpty {
                    ContentUnavailableView(
                        "No Notifications",
                        systemImage: "bell",
                        description: Text("You're all caught up.")
                    )
                } else {
                    List(notifications) { notif in
                        HStack(alignment: .top, spacing: 10) {
                            Circle()
                                .fill(notif.isRead ? Color.clear : Color.brandPrimary)
                                .frame(width: 8, height: 8)
                                .padding(.top, 5)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(notif.title)
                                    .font(.subheadline)
                                    .fontWeight(notif.isRead ? .regular : .semibold)
                                if let body = notif.body {
                                    Text(body)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                        .lineLimit(2)
                                }
                                Text(notif.created_at.prefix(10))
                                    .font(.caption2)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Notifications")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await fetchNotifications()
                markAllRead()
            }
            .refreshable { await fetchNotifications() }
        }
    }

    private func fetchNotifications() async {
        do {
            notifications = try await APIClient.shared.get(Endpoints.notifications)
        } catch {
            // Network errors are expected when offline — show empty state gracefully
        }
        isLoading = false
    }

    /// Marks everything read locally for instant UI, then PATCHes the server
    /// in an unstructured Task so dismissing the sheet can't cancel it mid-loop.
    private func markAllRead() {
        let unreadIds = notifications.filter { !$0.isRead }.map(\.id)
        guard !unreadIds.isEmpty else { return }

        let stamp = ISO8601DateFormatter().string(from: Date())
        notifications = notifications.map { notif in
            var updated = notif
            if updated.read_at == nil { updated.read_at = stamp }
            return updated
        }

        Task {
            struct MarkReadResponse: Decodable { let status: String }
            for id in unreadIds {
                let _: MarkReadResponse? = try? await APIClient.shared.patch(Endpoints.notificationRead(id))
            }
        }
    }
}
