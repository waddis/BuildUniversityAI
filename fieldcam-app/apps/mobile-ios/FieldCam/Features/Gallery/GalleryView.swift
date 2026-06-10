import SwiftUI

struct GalleryView: View {
    let projectId: String
    @State private var mediaItems: [MediaItem] = []
    @State private var isLoading = true
    @State private var selectedItem: MediaItem?
    @State private var errorMessage: String?

    private let columns = [
        GridItem(.adaptive(minimum: 105), spacing: 3)
    ]

    var body: some View {
        Group {
            if isLoading {
                VStack {
                    ProgressView()
                        .controlSize(.regular)
                    Text("Loading media...")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                        .padding(.top, 8)
                }
                .frame(maxHeight: .infinity)
            } else if let err = errorMessage {
                VStack(spacing: 12) {
                    Image(systemName: "wifi.exclamationmark")
                        .font(.system(size: 36))
                        .foregroundStyle(.red.opacity(0.4))
                    Text("Couldn't load photos")
                        .font(.subheadline.bold())
                    Text(err)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                    Button("Retry") { Task { await fetchMedia() } }
                        .font(.subheadline.bold())
                        .foregroundStyle(Color.brandPrimary)
                }
                .frame(maxHeight: .infinity)
            } else if mediaItems.isEmpty {
                VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(Color.brandPrimary.opacity(0.06))
                            .frame(width: 80, height: 80)
                        Image(systemName: "photo.on.rectangle.angled")
                            .font(.system(size: 30))
                            .foregroundStyle(Color.brandPrimary.opacity(0.4))
                    }
                    Text("No Photos Yet")
                        .font(.headline)
                        .foregroundStyle(.secondary)
                    Text("Tap the camera button to start\ncapturing project photos.")
                        .font(.subheadline)
                        .foregroundStyle(.tertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    // Photo count header
                    HStack {
                        Text("\(mediaItems.count) photo\(mediaItems.count == 1 ? "" : "s")")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 8)

                    LazyVGrid(columns: columns, spacing: 3) {
                        ForEach(mediaItems) { item in
                            Button { selectedItem = item } label: {
                                ZStack {
                                    Rectangle()
                                        .fill(Color(.systemGray6))
                                        .aspectRatio(1, contentMode: .fit)

                                    if let url = item.thumbnail_url, let imageURL = URL(string: url) {
                                        AsyncImage(url: imageURL) { image in
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        } placeholder: {
                                            ProgressView().controlSize(.small)
                                        }
                                        .frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, maxHeight: .infinity)
                                        .clipped()
                                    } else {
                                        Image(systemName: item.media_type == "video" ? "video.fill" : "photo")
                                            .font(.title3)
                                            .foregroundStyle(.tertiary)
                                    }

                                    // Video badge
                                    if item.media_type == "video" {
                                        VStack {
                                            HStack {
                                                Spacer()
                                                Image(systemName: "video.fill")
                                                    .font(.system(size: 9))
                                                    .foregroundStyle(.white)
                                                    .padding(4)
                                                    .background(.black.opacity(0.5))
                                                    .clipShape(RoundedRectangle(cornerRadius: 4))
                                                    .padding(4)
                                            }
                                            Spacer()
                                        }
                                    }

                                    // Room label
                                    if let room = item.room_label, !room.isEmpty {
                                        VStack {
                                            Spacer()
                                            HStack {
                                                Text(room)
                                                    .font(.system(size: 9, weight: .semibold))
                                                    .foregroundStyle(.white)
                                                    .padding(.horizontal, 5)
                                                    .padding(.vertical, 2)
                                                    .background(.black.opacity(0.55))
                                                    .clipShape(RoundedRectangle(cornerRadius: 3))
                                                Spacer()
                                            }
                                            .padding(4)
                                        }
                                    }
                                }
                                .aspectRatio(1, contentMode: .fit)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 3)
                }
            }
        }
        .task { await fetchMedia() }
        .refreshable { await fetchMedia() }
        .sheet(item: $selectedItem) { item in
            NavigationStack {
                MediaDetailView(item: item)
            }
        }
    }

    private func fetchMedia() async {
        errorMessage = nil
        do {
            mediaItems = try await MediaService.fetchForProject(id: projectId)
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
