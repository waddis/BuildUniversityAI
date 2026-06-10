import SwiftUI

struct ProjectListResponse: Decodable {
    let items: [Project]
    let total: Int
    let page: Int
    let page_size: Int
    let has_more: Bool
}

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var projects: [Project] = []
    @Published var isLoading = false
    @Published var searchText = ""
    @Published var statusFilter: String? = nil
    @Published var errorMessage: String?

    var filteredProjects: [Project] {
        var result = projects
        if let statusFilter {
            result = result.filter { $0.status == statusFilter }
        }
        if searchText.isEmpty { return result }
        return result.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.customer_name?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.address_line_1?.localizedCaseInsensitiveContains(searchText) ?? false) ||
            ($0.claim_number?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    func fetchProjects() async {
        isLoading = true
        errorMessage = nil
        do {
            let response: ProjectListResponse = try await APIClient.shared.get(Endpoints.projects)
            projects = response.items
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
