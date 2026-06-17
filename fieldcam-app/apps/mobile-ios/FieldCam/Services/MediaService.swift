import Foundation

struct MediaListResponse: Decodable {
    let items: [MediaItem]
    let total: Int
    let page: Int
    let page_size: Int
    let has_more: Bool
}

struct UploadURLResponse: Decodable {
    let upload_url: String
    let storage_key: String
    let expires_in: Int
}

struct MediaMetadata {
    let filename: String?
    let capturedAt: String?
    let latitude: Double?
    let longitude: Double?
    let roomLabel: String?
    let note: String?
}

struct MediaService {
    static func fetchForProject(id: String) async throws -> [MediaItem] {
        let response: MediaListResponse = try await APIClient.shared.get(Endpoints.projectMedia(id))
        return response.items
    }

    static func getUploadURL(projectId: String, filename: String, mediaType: String, contentType: String = "image/jpeg") async throws -> UploadURLResponse {
        struct Body: Encodable {
            let project_id: String
            let filename: String
            let media_type: String
            let content_type: String
        }
        return try await APIClient.shared.post(
            Endpoints.uploadURL,
            body: Body(project_id: projectId, filename: filename, media_type: mediaType, content_type: contentType)
        )
    }

    static func confirmUpload(storageKey: String, projectId: String, mediaType: String, metadata: MediaMetadata) async throws -> MediaItem {
        struct Body: Encodable {
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
        return try await APIClient.shared.post(
            Endpoints.media,
            body: Body(
                storage_key: storageKey,
                project_id: projectId,
                media_type: mediaType,
                original_filename: metadata.filename,
                captured_at: metadata.capturedAt,
                latitude: metadata.latitude,
                longitude: metadata.longitude,
                room_label: metadata.roomLabel,
                notes: metadata.note
            )
        )
    }
}

struct NoteService {
    struct NoteResponse: Decodable, Identifiable {
        let id: String
        let project_id: String
        let author_name: String?
        let body: String
        let created_at: String
    }

    static func fetchForProject(id: String) async throws -> [NoteResponse] {
        try await APIClient.shared.get(Endpoints.projectNotes(id))
    }

    static func create(projectId: String, body: String) async throws -> NoteResponse {
        struct Body: Encodable { let body: String }
        return try await APIClient.shared.post(Endpoints.projectNotes(projectId), body: Body(body: body))
    }

    static func delete(id: String) async throws {
        try await APIClient.shared.delete(Endpoints.note(id))
    }
}

struct TaskService {
    struct TaskListResponse: Decodable {
        let items: [FieldTask]
        let total: Int
    }

    static func fetchForProject(id: String) async throws -> [FieldTask] {
        let response: TaskListResponse = try await APIClient.shared.get(Endpoints.projectTasks(id))
        return response.items
    }

    static func create(projectId: String, title: String, priority: String = "medium") async throws -> FieldTask {
        struct Body: Encodable { let title: String; let priority: String }
        return try await APIClient.shared.post(Endpoints.projectTasks(projectId), body: Body(title: title, priority: priority))
    }

    static func update(id: String, status: String) async throws -> FieldTask {
        struct Body: Encodable { let status: String }
        return try await APIClient.shared.patch(Endpoints.task(id), body: Body(status: status))
    }
}
