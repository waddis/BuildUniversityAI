import Foundation

struct Project: Codable, Identifiable {
    let id: String
    let company_id: String
    let name: String
    let project_number: String?
    let status: String
    let customer_name: String?
    let address_line_1: String?
    let city: String?
    let state: String?
    let postal_code: String?
    let claim_number: String?
    let loss_date: String?
    let media_count: Int?
    let created_at: String
    let updated_at: String

    var displayAddress: String {
        [address_line_1, city, state, postal_code]
            .compactMap { $0 }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
    }

    var statusColor: String {
        switch status {
        case "new": return "blue"
        case "active": return "green"
        case "review": return "orange"
        case "complete": return "gray"
        default: return "gray"
        }
    }
}
