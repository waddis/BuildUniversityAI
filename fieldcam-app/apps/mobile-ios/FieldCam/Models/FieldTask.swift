import Foundation

struct FieldTask: Codable, Identifiable {
    let id: String
    let project_id: String
    let title: String
    let description: String?
    let status: String
    let priority: String
    let assigned_to: String?
    let due_at: String?
    let required_photo: Bool
    let completed_at: String?
    let created_at: String

    var isDone: Bool { status == "done" }
}
