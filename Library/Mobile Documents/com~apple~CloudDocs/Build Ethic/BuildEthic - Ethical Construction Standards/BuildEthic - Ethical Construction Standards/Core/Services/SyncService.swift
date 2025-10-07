import Foundation
import Combine

final class SyncService {
    static let shared = SyncService()
    private init() {}
    
    private let queue = DispatchQueue(label: "sync.queue")
    private var cancellables = Set<AnyCancellable>()

    struct SyncItem: Codable, Identifiable { 
        let id: String
        let path: String
        let method: String
        let body: Data?
        var retries: Int
    }
    
    private var pending: [SyncItem] = [] // REGEN: persist to Core Data for crash safety

    func bootstrap(session: AuthSession) async {
        await fetchConfig()
        await pullCourses()
        drain()
    }

    func enqueue(path: String, method: String = "POST", body: Data? = nil) {
        let item = SyncItem(
            id: UUID().uuidString, 
            path: path, 
            method: method, 
            body: body, 
            retries: 0
        )
        pending.append(item)
        drain()
    }

    private func drain() {
        queue.async { [weak self] in
            guard let self else { return }
            while let item = self.pending.first {
                Task { await self.send(item) }
                self.pending.removeFirst()
            }
        }
    }

    private func send(_ item: SyncItem) async {
        do {
            var req = URLRequest(url: APIClient.shared.baseURL.appendingPathComponent(item.path))
            req.httpMethod = item.method
            req.addValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = item.body
            _ = try await URLSession.shared.data(for: req)
        } catch {
            var i = item
            i.retries += 1
            if i.retries < 5 { 
                pending.append(i) 
            }
        }
    }

    private func fetchConfig() async { 
        // TODO: GET /config for feature flags 
    }
    
    private func pullCourses() async { 
        // TODO: hydrate cache for offline 
    }
}

