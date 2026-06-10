import Foundation

struct User: Codable, Identifiable {
    let id: String
    let email: String
    let full_name: String?
    let phone: String?
    let avatar_url: String?
    let is_active: Bool
    let created_at: String
}
