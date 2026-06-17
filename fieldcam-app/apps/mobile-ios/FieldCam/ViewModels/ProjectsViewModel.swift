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
    @Published var errorMessage: String?

    @Published var searchText = "" {
        didSet { if searchText != oldValue { scheduleFetch(debounce: true) } }
    }
    @Published var statusFilter: String? = nil {
        didSet { if statusFilter != oldValue { scheduleFetch(debounce: false) } }
    }

    private var fetchTask: Task<Void, Never>?

    var filteredProjects: [Project] { projects }

    /// One in-flight fetch at a time: a new keystroke or chip tap cancels the
    /// previous request so a slow stale response can never overwrite a newer
    /// one. Search keystrokes debounce 300ms (matching the web app).
    private func scheduleFetch(debounce: Bool) {
        fetchTask?.cancel()
        fetchTask = Task { [weak self] in
            if debounce {
                try? await Task.sleep(nanoseconds: 300_000_000)
                guard !Task.isCancelled else { return }
            }
            await self?.fetchProjects()
        }
    }

    func fetchProjects() async {
        isLoading = true
        errorMessage = nil
        do {
            var query = [URLQueryItem(name: "page_size", value: "100")]
            if !searchText.isEmpty {
                query.append(URLQueryItem(name: "q", value: searchText))
            }
            if let statusFilter {
                query.append(URLQueryItem(name: "status", value: statusFilter))
            }
            let response: ProjectListResponse = try await APIClient.shared.get(Endpoints.projects, query: query)
            guard !Task.isCancelled else { return }
            projects = response.items
        } catch is CancellationError {
            return
        } catch let error as URLError where error.code == .cancelled {
            return
        } catch {
            guard !Task.isCancelled else { return }
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
