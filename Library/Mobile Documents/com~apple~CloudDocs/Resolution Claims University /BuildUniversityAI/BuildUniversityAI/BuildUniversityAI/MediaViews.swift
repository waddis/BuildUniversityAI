import SwiftUI
import QuickLook

struct MediaGrid: View {
    let items: [Media]
    var body: some View {
        if items.isEmpty { EmptyView() }
        else {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                ForEach(items) { m in MediaTile(media: m) }
            }
        }
    }
}

struct MediaTile: View {
    let media: Media

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            switch media.kind {
            case .imageAsset:
                if UIImage(named: media.nameOrURL) != nil {
                    Image(media.nameOrURL)
                        .resizable().scaledToFill()
                        .frame(height: 140).clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    MissingAssetView(name: media.nameOrURL, kind: "Image asset")
                }
            case .remoteImage:
                if let url = URL(string: media.nameOrURL) {
                    AsyncImage(url: url) { img in
                        img.resizable().scaledToFill()
                    } placeholder: {
                        ProgressView()
                    }
                    .frame(height: 140).clipShape(RoundedRectangle(cornerRadius: 12))
                } else {
                    MissingAssetView(name: media.nameOrURL, kind: "Remote image URL")
                }
            case .usdzAsset:
                if media.nameOrURL.hasPrefix("http") {
                    // Remote USDZ model
                    if let url = URL(string: media.nameOrURL) {
                        ModelViewerButton(
                            title: "Open 3D Model",
                            source: .remote(url),
                            caption: media.caption ?? "Cached for offline viewing after first open."
                        )
                    } else {
                        MissingAssetView(name: media.nameOrURL, kind: "Remote USDZ URL")
                    }
                } else {
                    // Bundled USDZ model
                    ModelViewerButton(
                        title: "View 3D Model",
                        source: .named(media.nameOrURL),
                        caption: media.caption ?? "Spin, pinch-zoom, or place in AR."
                    )
                }
            }

            if let cap = media.caption, !cap.isEmpty {
                Text(cap).font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

struct MissingAssetView: View {
    let name: String
    let kind: String
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 12).stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
                .foregroundStyle(.secondary).frame(height: 140)
            VStack(spacing: 4) {
                Image(systemName: "exclamationmark.triangle")
                Text("\(kind) missing").font(.caption)
                Text(name).font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

