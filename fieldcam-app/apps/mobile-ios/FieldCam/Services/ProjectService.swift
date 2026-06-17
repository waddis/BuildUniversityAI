import Foundation

struct ProjectService {
    static func fetchAll() async throws -> [Project] {
        let response: ProjectListResponse = try await APIClient.shared.get(Endpoints.projects)
        return response.items
    }

    static func fetch(id: String) async throws -> Project {
        try await APIClient.shared.get(Endpoints.project(id))
    }

    static func create(_ body: CreateProjectBody) async throws -> Project {
        try await APIClient.shared.post(Endpoints.projects, body: body)
    }

    static func update(id: String, _ body: UpdateProjectBody) async throws -> Project {
        try await APIClient.shared.patch(Endpoints.project(id), body: body)
    }

    static func delete(id: String) async throws {
        try await APIClient.shared.delete(Endpoints.project(id))
    }
}

struct CreateProjectBody: Encodable {
    let name: String
    var project_number: String?
    var status: String = "new"
    var customer_name: String?
    var customer_phone: String?
    var address_line_1: String?
    var city: String?
    var state: String?
    var postal_code: String?
    var claim_number: String?
    var damage_category: String?
    var inspection_type: String?
    var loss_date: String?
}

struct UpdateProjectBody: Encodable {
    var name: String?
    var status: String?
    var customer_name: String?
    var address_line_1: String?
    var city: String?
    var state: String?
    var claim_number: String?
}
