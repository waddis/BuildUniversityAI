import SwiftUI
import QuickLook
import UniformTypeIdentifiers
import RealityKit

// MARK: - Public API

/// How you identify a USDZ model you want to show.
enum ModelSource: Hashable {
    /// A file bundled in the app. Provide the name WITHOUT the ".usdz" extension.
    case named(String)
    /// A fully qualified remote URL to a .usdz file (https://.../file.usdz)
    case remote(URL)
}

/// A compact SwiftUI component you can drop into any tile/card.
/// - Shows an optional thumbnail (if the model is bundled)
/// - Presents AR Quick Look on tap (local or remote)
struct ModelViewerButton: View {
    let title: String
    let source: ModelSource
    var caption: String? = nil

    @State private var isPresentingQL = false
    @State private var resolvedURL: URL? = nil
    @State private var isLoading = false
    @State private var loadError: String? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Thumbnail when the asset is bundled (RealityKit thumbnail)
            if case let .named(name) = source, let _ = Bundle.main.url(forResource: name, withExtension: "usdz") {
                // Model3D only renders bundled models; remote models are previewed on tap via Quick Look
                #if os(macOS)
                Model3D(named: name)
                    .frame(height: 160)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .overlay {
                        RoundedRectangle(cornerRadius: 12).stroke(.quaternary)
                    }
                #else
                // iOS fallback: show a placeholder for bundled models
                ZStack {
                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                        .fill(.quaternary)
                        .frame(height: 160)
                    VStack(spacing: 8) {
                        Image(systemName: "cube.transparent")
                            .font(.largeTitle)
                            .foregroundStyle(.secondary)
                        Text("3D Model")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .overlay {
                    RoundedRectangle(cornerRadius: 12).stroke(.quaternary)
                }
                #endif
            }

            Button(action: presentModel) {
                HStack(spacing: 10) {
                    Image(systemName: "cube.transparent")
                    Text(title)
                        .fontWeight(.semibold)
                    Spacer()
                    if isLoading { ProgressView().controlSize(.small) }
                }
                .padding(12)
                .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .disabled(isLoading)

            if let caption {
                Text(caption)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            if let loadError {
                Text(loadError)
                    .font(.footnote)
                    .foregroundStyle(.red)
            }
        }
        .sheet(isPresented: $isPresentingQL) {
            if let url = resolvedURL {
                USDZQuickLook(urls: [url])
                    .ignoresSafeArea()
            }
        }
    }

    private func presentModel() {
        isLoading = true
        loadError = nil

        ModelResolver.resolve(source: source) { result in
            DispatchQueue.main.async {
                isLoading = false
                switch result {
                case .success(let url):
                    resolvedURL = url
                    isPresentingQL = true
                case .failure(let err):
                    loadError = "Couldn't load model: \(err.localizedDescription)"
                }
            }
        }
    }
}

// MARK: - Resolver / Caching

enum ModelResolver {
    enum ResolveError: LocalizedError {
        case notFound
        case invalidResponse
        case writeFailed
        case unsupported
        var errorDescription: String? {
            switch self {
            case .notFound: return "Model file not found in bundle."
            case .invalidResponse: return "Remote model could not be downloaded."
            case .writeFailed: return "Failed to cache downloaded model."
            case .unsupported: return "Unsupported model location."
            }
        }
    }

    static func resolve(source: ModelSource, completion: @escaping (Result<URL, Error>) -> Void) {
        switch source {
        case .named(let name):
            if let url = Bundle.main.url(forResource: name, withExtension: "usdz") {
                completion(.success(url))
            } else {
                completion(.failure(ResolveError.notFound))
            }

        case .remote(let remoteURL):
            guard remoteURL.pathExtension.lowercased() == "usdz" else {
                completion(.failure(ResolveError.unsupported))
                return
            }

            // If it's already cached, return immediately
            if let cached = cachedURL(for: remoteURL), FileManager.default.fileExists(atPath: cached.path) {
                completion(.success(cached))
                return
            }

            // Download and cache
            let request = URLRequest(url: remoteURL, cachePolicy: .reloadIgnoringLocalAndRemoteCacheData)
            URLSession.shared.downloadTask(with: request) { tempURL, response, error in
                if let error = error {
                    completion(.failure(error))
                    return
                }
                guard
                    let tempURL = tempURL,
                    let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode)
                else {
                    completion(.failure(ResolveError.invalidResponse))
                    return
                }

                do {
                    let dest = cachedURL(for: remoteURL) ?? FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + ".usdz")
                    try prepareCacheDirectoryIfNeeded(url: dest)
                    // Remove if exists then move
                    _ = try? FileManager.default.removeItem(at: dest)
                    try FileManager.default.moveItem(at: tempURL, to: dest)
                    completion(.success(dest))
                } catch {
                    completion(.failure(ResolveError.writeFailed))
                }
            }.resume()
        }
    }

    private static func cachedURL(for remoteURL: URL) -> URL? {
        guard let base = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first else { return nil }
        let fileName = remoteURL.lastPathComponent
        return base.appendingPathComponent("USDZCache", isDirectory: true).appendingPathComponent(fileName)
    }

    private static func prepareCacheDirectoryIfNeeded(url: URL) throws {
        let dir = url.deletingLastPathComponent()
        if !FileManager.default.fileExists(atPath: dir.path) {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        }
    }
}

// MARK: - Quick Look presenter

/// Wraps QLPreviewController so USDZ opens with AR and 3D interaction.
struct USDZQuickLook: UIViewControllerRepresentable {
    let urls: [URL]

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        // (Optional) You can preselect the first item if needed.
        return controller
    }

    func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) { }

    func makeCoordinator() -> Coordinator { Coordinator(urls: urls) }

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        private let items: [QLPreviewItemBox]

        init(urls: [URL]) {
            self.items = urls.map { QLPreviewItemBox(url: $0) }
        }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
            items.count
        }

        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            items[index]
        }
    }

    /// QLPreviewItem wrapper
    final class QLPreviewItemBox: NSObject, QLPreviewItem {
        let previewItemURL: URL?
        init(url: URL) { self.previewItemURL = url }
    }
}
