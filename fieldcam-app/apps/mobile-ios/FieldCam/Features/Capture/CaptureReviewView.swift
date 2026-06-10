import SwiftUI

struct CaptureReviewView: View {
    let image: UIImage
    let latitude: Double?
    let longitude: Double?
    let onDismiss: () -> Void

    @State private var note = ""
    @State private var roomLabel = ""
    @State private var selectedProjectId: String?
    @State private var isUploading = false
    @StateObject private var projectsVM = ProjectsViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Preview
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.horizontal)

                    // Metadata
                    VStack(alignment: .leading, spacing: 12) {
                        if let lat = latitude, let lng = longitude {
                            HStack {
                                Image(systemName: "location.fill")
                                    .foregroundStyle(Color.brandPrimary)
                                    .font(.caption)
                                Text(String(format: "%.5f, %.5f", lat, lng))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        // Project picker
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Project")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Picker("Project", selection: $selectedProjectId) {
                                Text("Select a project").tag(nil as String?)
                                ForEach(projectsVM.projects) { project in
                                    Text(project.name).tag(project.id as String?)
                                }
                            }
                            .pickerStyle(.menu)
                        }

                        // Room label
                        TextField("Room / Area Label", text: $roomLabel)
                            .textFieldStyle(.roundedBorder)

                        // Note
                        TextField("Add a note...", text: $note, axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(3)
                    }
                    .padding(.horizontal)
                }
            }
            .navigationTitle("Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Discard") { onDismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button {
                        uploadPhoto()
                    } label: {
                        if isUploading {
                            ProgressView()
                        } else {
                            Text("Upload")
                                .bold()
                        }
                    }
                    .disabled(selectedProjectId == nil || isUploading)
                }
            }
            .task { await projectsVM.fetchProjects() }
        }
    }

    private func uploadPhoto() {
        guard let projectId = selectedProjectId else { return }
        isUploading = true

        // Save to local queue for upload
        if let data = image.jpegData(compressionQuality: 0.85) {
            let filename = "capture_\(Int(Date().timeIntervalSince1970)).jpg"
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            try? data.write(to: tempURL)

            Task { @MainActor in
                UploadQueue.shared.enqueue(
                    fileURL: tempURL,
                    projectId: projectId,
                    mediaType: "photo",
                    latitude: latitude,
                    longitude: longitude,
                    note: note.isEmpty ? nil : note
                )
                isUploading = false
                onDismiss()
            }
        }
    }
}
