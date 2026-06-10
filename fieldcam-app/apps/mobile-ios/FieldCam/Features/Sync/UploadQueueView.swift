import SwiftUI

struct UploadQueueView: View {
    @StateObject private var queue = UploadQueue.shared
    @StateObject private var reachability = Reachability.shared

    var body: some View {
        NavigationStack {
            List {
                // Status summary
                Section {
                    if !reachability.isConnected {
                        HStack {
                            Image(systemName: "wifi.slash")
                                .foregroundStyle(.red)
                            Text("Offline — uploads will resume when connected")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    if queue.isProcessing {
                        HStack {
                            ProgressView()
                                .controlSize(.small)
                            Text("Uploading...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                // Queued / in progress
                let pending = queue.items.filter { $0.status != .uploaded && $0.status != .failed }
                if !pending.isEmpty {
                    Section("Pending (\(pending.count))") {
                        ForEach(pending) { item in
                            QueueItemRow(item: item)
                        }
                    }
                }

                // Failed
                let failed = queue.items.filter { $0.status == .failed }
                if !failed.isEmpty {
                    Section("Failed (\(failed.count))") {
                        ForEach(failed) { item in
                            QueueItemRow(item: item)
                                .swipeActions {
                                    Button("Retry") { queue.retryItem(item.id) }
                                        .tint(Color.brandPrimary)
                                    Button("Delete", role: .destructive) { queue.remove(item.id) }
                                }
                        }
                    }
                }

                // Completed
                let completed = queue.items.filter { $0.status == .uploaded }
                if !completed.isEmpty {
                    Section("Completed (\(completed.count))") {
                        ForEach(completed) { item in
                            QueueItemRow(item: item)
                        }
                    }
                }

                // Empty state
                if queue.items.isEmpty {
                    ContentUnavailableView(
                        "No Uploads",
                        systemImage: "arrow.up.circle",
                        description: Text("Captured photos will appear here before uploading.")
                    )
                }
            }
            .navigationTitle("Upload Queue")
            .toolbar {
                if queue.failedCount > 0 {
                    ToolbarItem(placement: .primaryAction) {
                        Button("Retry All") { queue.retryFailed() }
                    }
                }
                if queue.items.contains(where: { $0.status == .uploaded }) {
                    ToolbarItem(placement: .secondaryAction) {
                        Button("Clear Completed") { queue.clearCompleted() }
                    }
                }
            }
        }
    }
}

struct QueueItemRow: View {
    let item: QueueItem

    var body: some View {
        HStack(spacing: 12) {
            // Status icon
            statusIcon
                .frame(width: 28)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.localFileURL.lastPathComponent)
                    .font(.subheadline)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(item.mediaType.capitalized)
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if item.retryCount > 0 {
                        Text("Retry \(item.retryCount)")
                            .font(.caption2)
                            .foregroundStyle(Color.brandWarning)
                    }

                    if let error = item.errorMessage {
                        Text(error)
                            .font(.caption2)
                            .foregroundStyle(.red)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            Text(statusText)
                .font(.caption)
                .foregroundStyle(statusColor)
        }
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch item.status {
        case .queued:
            Image(systemName: "clock")
                .foregroundStyle(.secondary)
        case .gettingURL, .uploading, .confirming:
            ProgressView()
                .controlSize(.small)
        case .uploaded:
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(Color.brandSuccess)
        case .failed:
            Image(systemName: "exclamationmark.circle.fill")
                .foregroundStyle(.red)
        }
    }

    private var statusText: String {
        switch item.status {
        case .queued: return "Queued"
        case .gettingURL: return "Preparing..."
        case .uploading: return "Uploading..."
        case .confirming: return "Confirming..."
        case .uploaded: return "Done"
        case .failed: return "Failed"
        }
    }

    private var statusColor: Color {
        switch item.status {
        case .queued: return .secondary
        case .gettingURL, .uploading, .confirming: return .brandPrimary
        case .uploaded: return .brandSuccess
        case .failed: return .brandDanger
        }
    }
}
