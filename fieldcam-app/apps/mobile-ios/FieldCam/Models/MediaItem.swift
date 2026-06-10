import Foundation

struct MediaItem: Codable, Identifiable {
    let id: String
    let project_id: String
    let uploaded_by: String
    let media_type: String
    let storage_key: String
    let original_filename: String?
    let thumbnail_url: String?
    let preview_url: String?
    let status: String
    let room_label: String?
    let area_label: String?
    let notes: String?
    let captured_at: String?
    let latitude: Double?
    let longitude: Double?
    let created_at: String
}
