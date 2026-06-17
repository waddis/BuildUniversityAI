import Foundation
import Combine

@MainActor
final class SyncMonitor: ObservableObject {
    static let shared = SyncMonitor()

    private var cancellables = Set<AnyCancellable>()
    private var retryTimer: Timer?

    private init() {
        // Watch connectivity changes
        Reachability.shared.$isConnected
            .removeDuplicates()
            .sink { [weak self] connected in
                if connected {
                    self?.onConnected()
                }
            }
            .store(in: &cancellables)

        // Start periodic retry check
        startPeriodicCheck()
    }

    private func onConnected() {
        // Resume any queued uploads when connectivity returns
        UploadQueue.shared.startProcessing()
    }

    private func startPeriodicCheck() {
        // Check every 30 seconds for items that need retry
        retryTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard Reachability.shared.isConnected else { return }
                let queue = UploadQueue.shared
                if queue.pendingCount > 0 && !queue.isProcessing {
                    queue.startProcessing()
                }
            }
        }
    }
}
