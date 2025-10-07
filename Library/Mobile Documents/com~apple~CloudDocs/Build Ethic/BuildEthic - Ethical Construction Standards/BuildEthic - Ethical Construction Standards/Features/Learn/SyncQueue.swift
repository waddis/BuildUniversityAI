import Foundation

final class SyncQueue {
    static let shared = SyncQueue()
    private var queue: [XAPIStatement] = []
    private let lock = NSLock()

    func enqueue(statement: XAPIStatement) {
        lock.lock(); defer { lock.unlock() }
        queue.append(statement)
        Task { await flushIfOnline() }
    }

    @discardableResult
    func flushIfOnline() async -> Bool {
        guard let launch = PlayerSession.shared.currentLaunch else { return false }
        guard NetworkMonitor.shared.isReachable else { return false }
        lock.lock(); let items = queue; queue.removeAll(); lock.unlock()
        for s in items {
            do {
                try await XAPIClient.shared.send(statement: s, endpoint: launch.xapiEndpoint, auth: launch.xapiAuthToken)
            } catch {
                // requeue on failure
                enqueue(statement: s)
                return false
            }
        }
        return true
    }
}

final class PlayerSession {
    static let shared = PlayerSession()
    var currentLaunch: SCORMLaunchToken?
}

final class NetworkMonitor { // stub; replace with NWPathMonitor
    static let shared = NetworkMonitor()
    var isReachable: Bool { true }
}
