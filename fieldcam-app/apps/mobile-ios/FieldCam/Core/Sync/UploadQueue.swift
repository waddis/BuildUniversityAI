import Foundation
import UIKit

struct QueueItem: Codable, Identifiable {
    let id: UUID
    let localFileURL: URL
    let projectId: String
    let mediaType: String
    let capturedAt: Date
    let latitude: Double?
    let longitude: Double?
    let note: String?
    let roomLabel: String?
    var status: QueueStatus
    var retryCount: Int
    var errorMessage: String?
    var storageKey: String?

    enum QueueStatus: String, Codable {
        case queued, gettingURL, uploading, confirming, uploaded, failed
    }
}

@MainActor
final class UploadQueue: ObservableObject {
    static let shared = UploadQueue()

    @Published var items: [QueueItem] = []
    @Published var isProcessing = false

    private let maxRetries = 5
    private var processingTask: Task<Void, Never>?

    private init() {
        items = LocalStore.shared.load([QueueItem].self, forKey: "upload_queue") ?? []
    }

    var pendingCount: Int { items.filter { $0.status != .uploaded }.count }
    var failedCount: Int { items.filter { $0.status == .failed }.count }

    func enqueue(
        fileURL: URL,
        projectId: String,
        mediaType: String,
        latitude: Double?,
        longitude: Double?,
        note: String?,
        roomLabel: String? = nil
    ) {
        let item = QueueItem(
            id: UUID(),
            localFileURL: fileURL,
            projectId: projectId,
            mediaType: mediaType,
            capturedAt: Date(),
            latitude: latitude,
            longitude: longitude,
            note: note,
            roomLabel: roomLabel,
            status: .queued,
            retryCount: 0,
            errorMessage: nil,
            storageKey: nil
        )
        items.append(item)
        persist()
        startProcessing()
    }

    func startProcessing() {
        guard !isProcessing else { return }
        guard Reachability.shared.isConnected else { return }

        processingTask = Task {
            isProcessing = true
            while let index = items.firstIndex(where: { $0.status == .queued }) {
                guard Reachability.shared.isConnected else { break }
                await processItem(at: index)
            }
            isProcessing = false
        }
    }

    func processNext() async {
        guard let index = items.firstIndex(where: { $0.status == .queued }) else { return }
        await processItem(at: index)
    }

    private func processItem(at index: Int) async {
        guard items.indices.contains(index) else { return }
        let item = items[index]

        // Step 1: Get presigned upload URL
        items[index].status = .gettingURL
        persist()

        do {
            let filename = item.localFileURL.lastPathComponent
            let contentType = item.mediaType == "video" ? "video/quicktime" : "image/jpeg"

            struct UploadURLBody: Encodable {
                let project_id: String
                let filename: String
                let media_type: String
                let content_type: String
            }

            struct UploadURLResp: Decodable {
                let upload_url: String
                let storage_key: String
            }

            let urlResponse: UploadURLResp = try await APIClient.shared.post(
                Endpoints.uploadURL,
                body: UploadURLBody(
                    project_id: item.projectId,
                    filename: filename,
                    media_type: item.mediaType,
                    content_type: contentType
                )
            )

            items[index].storageKey = urlResponse.storage_key

            // Step 2: Upload file to S3
            items[index].status = .uploading
            persist()

            let fileData = try Data(contentsOf: item.localFileURL)
            guard let uploadURL = URL(string: urlResponse.upload_url) else {
                throw UploadError.uploadFailed
            }
            var request = URLRequest(url: uploadURL)
            request.httpMethod = "PUT"
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
            request.httpBody = fileData

            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                throw UploadError.uploadFailed
            }

            // Step 3: Confirm upload with API
            items[index].status = .confirming
            persist()

            struct ConfirmBody: Encodable {
                let storage_key: String
                let project_id: String
                let media_type: String
                let original_filename: String?
                let captured_at: String?
                let latitude: Double?
                let longitude: Double?
                let room_label: String?
                let notes: String?
            }

            let _: EmptyResponse = try await APIClient.shared.post(
                Endpoints.media,
                body: ConfirmBody(
                    storage_key: urlResponse.storage_key,
                    project_id: item.projectId,
                    media_type: item.mediaType,
                    original_filename: filename,
                    captured_at: ISO8601DateFormatter().string(from: item.capturedAt),
                    latitude: item.latitude,
                    longitude: item.longitude,
                    room_label: item.roomLabel,
                    notes: item.note
                )
            )

            // Success
            items[index].status = .uploaded
            items[index].errorMessage = nil
            persist()

            // Cleanup temp file
            try? FileManager.default.removeItem(at: item.localFileURL)

        } catch {
            items[index].retryCount += 1
            items[index].errorMessage = error.localizedDescription

            if items[index].retryCount >= maxRetries {
                items[index].status = .failed
            } else {
                items[index].status = .queued
                // Exponential backoff
                let delay = pow(2.0, Double(items[index].retryCount))
                try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
            }
            persist()
        }
    }

    func retryFailed() {
        for i in items.indices where items[i].status == .failed {
            items[i].status = .queued
            items[i].retryCount = 0
            items[i].errorMessage = nil
        }
        persist()
        startProcessing()
    }

    func retryItem(_ id: UUID) {
        guard let index = items.firstIndex(where: { $0.id == id }) else { return }
        items[index].status = .queued
        items[index].retryCount = 0
        items[index].errorMessage = nil
        persist()
        startProcessing()
    }

    func remove(_ id: UUID) {
        if let index = items.firstIndex(where: { $0.id == id }) {
            let item = items[index]
            try? FileManager.default.removeItem(at: item.localFileURL)
        }
        items.removeAll { $0.id == id }
        persist()
    }

    func clearCompleted() {
        items.removeAll { $0.status == .uploaded }
        persist()
    }

    private func persist() {
        LocalStore.shared.save(items, forKey: "upload_queue")
    }
}

enum UploadError: LocalizedError {
    case uploadFailed
    case noConnection

    var errorDescription: String? {
        switch self {
        case .uploadFailed: return "File upload failed"
        case .noConnection: return "No internet connection"
        }
    }
}
