import SwiftUI

struct BatchReviewView: View {
    let captures: [CapturedMedia]
    let projectId: String?
    let onComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var selectedIndex = 0
    @State private var notes: [UUID: String] = [:]
    @State private var roomLabels: [UUID: String] = [:]
    @State private var isUploading = false
    @State private var uploadProgress = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Photo carousel
                TabView(selection: $selectedIndex) {
                    ForEach(Array(captures.enumerated()), id: \.element.id) { index, media in
                        if let image = media.image {
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .tag(index)
                        } else {
                            ZStack {
                                Rectangle().fill(.black)
                                Image(systemName: "video.fill")
                                    .font(.largeTitle)
                                    .foregroundStyle(.white)
                            }
                            .tag(index)
                        }
                    }
                }
                .tabViewStyle(.page)
                .frame(height: 300)
                .background(.black)

                // Counter
                Text("\(selectedIndex + 1) of \(captures.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)

                // Metadata for current item
                if captures.indices.contains(selectedIndex) {
                    let current = captures[selectedIndex]
                    ScrollView {
                        VStack(alignment: .leading, spacing: 12) {
                            // GPS
                            if let lat = current.latitude, let lng = current.longitude {
                                HStack {
                                    Image(systemName: "location.fill")
                                        .font(.caption)
                                        .foregroundStyle(Color.brandPrimary)
                                    Text(String(format: "%.5f, %.5f", lat, lng))
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            // Room label
                            TextField("Room / Area", text: Binding(
                                get: { roomLabels[current.id] ?? "" },
                                set: { roomLabels[current.id] = $0 }
                            ))
                            .textFieldStyle(.roundedBorder)

                            // Note
                            TextField("Note", text: Binding(
                                get: { notes[current.id] ?? "" },
                                set: { notes[current.id] = $0 }
                            ), axis: .vertical)
                            .textFieldStyle(.roundedBorder)
                            .lineLimit(2)
                        }
                        .padding()
                    }
                }

                // Upload progress
                if isUploading {
                    VStack(spacing: 8) {
                        ProgressView(value: Double(uploadProgress), total: Double(captures.count))
                        Text("Uploading \(uploadProgress)/\(captures.count)...")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                }
            }
            .navigationTitle("Review \(captures.count) Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Upload All") { uploadAll() }
                        .bold()
                        .disabled(isUploading || projectId == nil)
                }
            }
        }
    }

    private func uploadAll() {
        guard let projectId else { return }
        isUploading = true
        uploadProgress = 0

        Task { @MainActor in
            for capture in captures {
                if let image = capture.image, let data = image.jpegData(compressionQuality: 0.85) {
                    let filename = "capture_\(Int(capture.timestamp.timeIntervalSince1970))_\(capture.id.uuidString.prefix(8)).jpg"
                    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
                    try? data.write(to: tempURL)

                    UploadQueue.shared.enqueue(
                        fileURL: tempURL,
                        projectId: projectId,
                        mediaType: "photo",
                        latitude: capture.latitude,
                        longitude: capture.longitude,
                        note: notes[capture.id]
                    )
                } else if let videoURL = capture.videoURL {
                    UploadQueue.shared.enqueue(
                        fileURL: videoURL,
                        projectId: projectId,
                        mediaType: "video",
                        latitude: capture.latitude,
                        longitude: capture.longitude,
                        note: notes[capture.id]
                    )
                }
                uploadProgress += 1
            }

            // Trigger upload processing
            await UploadQueue.shared.processNext()

            isUploading = false
            onComplete()
        }
    }
}
