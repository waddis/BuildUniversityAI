import SwiftUI

struct Report: Decodable, Identifiable {
    let id: String
    let project_id: String
    let title: String
    let status: String
    let download_url: String?
    let items: [ReportItem]
    let created_at: String

    struct ReportItem: Decodable, Identifiable {
        let id: String
        let media_id: String?
        let note_text: String?
        let thumbnail_url: String?
    }
}

struct ReportService {
    static func fetchForProject(id: String) async throws -> [Report] {
        try await APIClient.shared.get(Endpoints.projectReports(id))
    }

    static func create(projectId: String, title: String, mediaIds: [String]) async throws -> Report {
        struct Body: Encodable { let title: String; let media_ids: [String] }
        return try await APIClient.shared.post(
            Endpoints.projectReports(projectId),
            body: Body(title: title, media_ids: mediaIds)
        )
    }

    static func generate(reportId: String) async throws {
        struct GenerateResponse: Decodable { let message: String; let report_id: String }
        let _: GenerateResponse = try await APIClient.shared.post(Endpoints.reportGenerate(reportId))
    }
}

struct ReportsView: View {
    let projectId: String

    @State private var reports: [Report] = []
    @State private var media: [MediaItem] = []
    @State private var isLoading = true
    @State private var showCreate = false
    @State private var title = ""
    @State private var selectedMedia: Set<String> = []
    @State private var isCreating = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text("\(reports.count) report\(reports.count == 1 ? "" : "s")")
                        .font(.system(size: 13))
                        .foregroundStyle(.secondary)
                    Spacer()
                    Button {
                        withAnimation { showCreate.toggle() }
                    } label: {
                        Label("New Report", systemImage: "plus")
                            .font(.system(size: 13, weight: .medium))
                    }
                }

                if let errorMessage {
                    Text(errorMessage)
                        .font(.system(size: 12))
                        .foregroundStyle(.red)
                }

                if showCreate {
                    createForm
                }

                if isLoading {
                    HStack {
                        Spacer()
                        ProgressView("Loading reports...")
                            .padding(.vertical, 32)
                        Spacer()
                    }
                } else if reports.isEmpty && !showCreate {
                    Text("No reports yet. Create one to get started.")
                        .font(.system(size: 13))
                        .foregroundStyle(.tertiary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 32)
                } else {
                    VStack(spacing: 8) {
                        ForEach(reports) { report in
                            ReportRow(report: report) {
                                await generate(report)
                            }
                        }
                    }
                }
            }
            .padding(16)
        }
        .background(Color(.systemGroupedBackground))
        .task { await load() }
        .refreshable { await load() }
    }

    private var createForm: some View {
        VStack(alignment: .leading, spacing: 14) {
            TextField("Report title...", text: $title)
                .textFieldStyle(.roundedBorder)

            VStack(alignment: .leading, spacing: 8) {
                Text("Select photos (\(selectedMedia.count))")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 56), spacing: 6)], spacing: 6) {
                    ForEach(media) { item in
                        mediaCell(item)
                    }
                }
            }

            HStack(spacing: 8) {
                Button {
                    Task { await create() }
                } label: {
                    Text(isCreating ? "Creating..." : "Create Report")
                        .font(.system(size: 13, weight: .medium))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color.brandPrimary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isCreating)

                Button {
                    withAnimation { showCreate = false }
                } label: {
                    Text("Cancel")
                        .font(.system(size: 13))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color(.secondarySystemFill))
                        .foregroundStyle(.primary)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(16)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 2)
    }

    private func mediaCell(_ item: MediaItem) -> some View {
        Button {
            if selectedMedia.contains(item.id) {
                selectedMedia.remove(item.id)
            } else {
                selectedMedia.insert(item.id)
            }
        } label: {
            ZStack {
                AsyncImage(url: item.thumbnail_url.flatMap(URL.init(string:))) { image in
                    image.resizable().aspectRatio(contentMode: .fill)
                } placeholder: {
                    Color(.secondarySystemFill)
                        .overlay(Image(systemName: "doc.text").font(.system(size: 14)).foregroundStyle(.tertiary))
                }
                .frame(width: 56, height: 56)
                .clipShape(RoundedRectangle(cornerRadius: 6))

                if selectedMedia.contains(item.id) {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.brandPrimary.opacity(0.25))
                        .frame(width: 56, height: 56)
                    Image(systemName: "checkmark")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                }
            }
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(selectedMedia.contains(item.id) ? Color.brandPrimary : .clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }

    private func load() async {
        do {
            async let reportsTask: [Report] = ReportService.fetchForProject(id: projectId)
            async let mediaTask = MediaService.fetchForProject(id: projectId)
            reports = try await reportsTask
            media = (try? await mediaTask) ?? []
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func create() async {
        isCreating = true
        do {
            let report = try await ReportService.create(
                projectId: projectId,
                title: title,
                mediaIds: Array(selectedMedia)
            )
            reports.insert(report, at: 0)
            withAnimation { showCreate = false }
            title = ""
            selectedMedia = []
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isCreating = false
    }

    private func generate(_ report: Report) async {
        do {
            try await ReportService.generate(reportId: report.id)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        // Refetch even on error — a 409 means the report is already
        // generating, so the row should flip to the spinner state.
        reports = (try? await ReportService.fetchForProject(id: projectId)) ?? reports
    }
}

private struct ReportRow: View {
    let report: Report
    let onGenerate: () async -> Void

    @State private var isGenerating = false

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(report.title)
                    .font(.system(size: 14, weight: .medium))
                Text("\(report.items.count) items · \(report.status)")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            }
            Spacer()

            if report.status == "draft" || report.status == "failed" {
                Button {
                    isGenerating = true
                    Task {
                        await onGenerate()
                        isGenerating = false
                    }
                } label: {
                    Text(report.status == "failed" ? "Failed — Retry" : "Generate PDF")
                        .font(.system(size: 11, weight: .medium))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background((report.status == "failed" ? Color.brandDanger : Color.brandPrimary).opacity(0.08))
                        .foregroundStyle(report.status == "failed" ? Color.brandDanger : Color.brandPrimary)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .disabled(isGenerating)
            } else if report.status == "generating" {
                HStack(spacing: 4) {
                    ProgressView().controlSize(.mini)
                    Text("Generating...")
                        .font(.system(size: 11))
                        .foregroundStyle(Color.brandWarning)
                }
            } else if report.status == "ready", let url = downloadURL {
                Link(destination: url) {
                    Label("Download PDF", systemImage: "arrow.down.circle")
                        .font(.system(size: 11, weight: .medium))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.brandSuccess.opacity(0.1))
                        .foregroundStyle(Color.brandSuccess)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 1)
    }

    private var downloadURL: URL? {
        guard let raw = report.download_url else { return nil }
        if let url = URL(string: raw), url.scheme != nil { return url }
        return URL(string: raw, relativeTo: APIClient.shared.baseURL)
    }
}
