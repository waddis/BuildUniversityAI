import SwiftUI
import PhotosUI

struct PhotoPickerView: View {
    let projectId: String
    @Environment(\.dismiss) private var dismiss
    @State private var selectedItems: [PhotosPickerItem] = []
    @State private var pickedImages: [UIImage] = []
    @State private var isProcessing = false
    @State private var uploadCount = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if pickedImages.isEmpty {
                    // Picker
                    PhotosPicker(
                        selection: $selectedItems,
                        maxSelectionCount: 20,
                        matching: .images
                    ) {
                        VStack(spacing: 16) {
                            ZStack {
                                Circle()
                                    .fill(Color.brandPrimary.opacity(0.08))
                                    .frame(width: 80, height: 80)
                                Image(systemName: "photo.on.rectangle.angled")
                                    .font(.system(size: 32))
                                    .foregroundStyle(Color.brandPrimary)
                            }
                            Text("Select Photos")
                                .font(.headline)
                            Text("Choose photos from your library\nto add to this project.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    .onChange(of: selectedItems) { _, items in
                        Task { await loadImages(items) }
                    }
                } else {
                    // Preview selected photos
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 4)], spacing: 4) {
                            ForEach(Array(pickedImages.enumerated()), id: \.offset) { _, image in
                                Image(uiImage: image)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(minHeight: 100)
                                    .clipped()
                                    .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                        }
                        .padding()
                    }

                    // Upload progress
                    if isProcessing {
                        VStack(spacing: 8) {
                            ProgressView(value: Double(uploadCount), total: Double(pickedImages.count))
                                .padding(.horizontal)
                            Text("Queuing \(uploadCount)/\(pickedImages.count)...")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }

                    // Upload button
                    Button {
                        queueUploads()
                    } label: {
                        HStack {
                            Image(systemName: "arrow.up.circle.fill")
                            Text("Upload \(pickedImages.count) Photo\(pickedImages.count == 1 ? "" : "s")")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.brandPrimary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    .padding(.horizontal)
                    .disabled(isProcessing)
                }
            }
            .navigationTitle("Add Photos")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func loadImages(_ items: [PhotosPickerItem]) async {
        var images: [UIImage] = []
        for item in items {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                images.append(image)
            }
        }
        pickedImages = images
    }

    private func queueUploads() {
        isProcessing = true
        uploadCount = 0

        Task { @MainActor in
            for image in pickedImages {
                if let data = image.jpegData(compressionQuality: 0.85) {
                    let filename = "photo_\(Int(Date().timeIntervalSince1970))_\(uploadCount).jpg"
                    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
                    try? data.write(to: tempURL)

                    UploadQueue.shared.enqueue(
                        fileURL: tempURL,
                        projectId: projectId,
                        mediaType: "photo",
                        latitude: nil,
                        longitude: nil,
                        note: nil
                    )
                }
                uploadCount += 1
            }
            isProcessing = false
            dismiss()
        }
    }
}
