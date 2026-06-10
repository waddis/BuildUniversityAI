import SwiftUI

struct ActivityEvent: Decodable, Identifiable {
    let id: String
    let event_type: String
    let entity_type: String
    let actor_name: String?
    let created_at: String
}

struct ActivityService {
    static func fetchForProject(id: String) async throws -> [ActivityEvent] {
        try await APIClient.shared.get(
            Endpoints.activity,
            query: [URLQueryItem(name: "project_id", value: id)]
        )
    }
}

struct ActivityFeedView: View {
    let projectId: String

    @State private var events: [ActivityEvent] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 14) {
                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView("Loading activity...")
                            .padding(.vertical, 32)
                        Spacer()
                    }
                } else if events.isEmpty {
                    Text("Activity will appear here as you work on this project.")
                        .font(.system(size: 13))
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                        .padding(.vertical, 32)
                } else {
                    ForEach(events) { event in
                        HStack(alignment: .top, spacing: 12) {
                            Image(systemName: icon(for: event.entity_type))
                                .font(.system(size: 13))
                                .foregroundStyle(.secondary)
                                .frame(width: 32, height: 32)
                                .background(Color(.secondarySystemFill))
                                .clipShape(Circle())

                            VStack(alignment: .leading, spacing: 2) {
                                Text(label(for: event))
                                    .font(.system(size: 13))
                                    .foregroundStyle(.primary)
                                Text(relativeTime(event.created_at))
                                    .font(.system(size: 11))
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(Color(.systemGroupedBackground))
        .task { await load() }
        .refreshable { await load() }
    }

    private func load() async {
        events = (try? await ActivityService.fetchForProject(id: projectId)) ?? []
        isLoading = false
    }

    private func icon(for entityType: String) -> String {
        switch entityType {
        case "media": return "camera"
        case "note": return "doc.text"
        case "comment": return "bubble.left"
        case "task": return "checkmark.square"
        case "project": return "folder"
        case "membership": return "person.2"
        default: return "folder"
        }
    }

    private func label(for event: ActivityEvent) -> String {
        let actor = event.actor_name ?? "Someone"
        switch event.event_type {
        case "media.uploaded": return "\(actor) uploaded a photo"
        case "media.deleted": return "\(actor) deleted a photo"
        case "note.created": return "\(actor) added a note"
        case "comment.created": return "\(actor) left a comment"
        case "task.created": return "\(actor) created a task"
        case "task.updated": return "\(actor) updated a task"
        case "project.created": return "\(actor) created this project"
        case "project.updated": return "\(actor) updated project details"
        case "project.archived": return "\(actor) archived this project"
        default: return "\(actor) performed \(event.event_type)"
        }
    }

    private func relativeTime(_ isoString: String) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var date = formatter.date(from: isoString)
        if date == nil {
            formatter.formatOptions = [.withInternetDateTime]
            date = formatter.date(from: isoString)
        }
        guard let date else { return isoString }
        return RelativeDateTimeFormatter().localizedString(for: date, relativeTo: Date())
    }
}
