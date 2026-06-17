import SwiftUI

// MARK: - API Response Types

struct AnnotationResponse: Decodable, Identifiable {
    let id: String
    let annotation_data: AnnotationData
    let version: Int
    let created_at: String

    struct AnnotationData: Decodable {
        let elements: [[String: AnyCodableValue]]?
        let canvas_width: Double?
        let canvas_height: Double?
    }
}

struct AnyCodableValue: Decodable {
    let value: Any
    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let v = try? c.decode(Double.self) { value = v }
        else if let v = try? c.decode(String.self) { value = v }
        else if let v = try? c.decode(Int.self) { value = v }
        else { value = "" }
    }
    var doubleValue: Double? { value as? Double ?? (value as? Int).map(Double.init) }
    var stringValue: String? { value as? String }
}

// MARK: - Media Detail View

struct MediaDetailView: View {
    let item: MediaItem
    @State private var showAnnotationEditor = false
    @State private var annotations: [AnnotationResponse] = []
    @State private var showAnnotations = true
    @State private var loadedImage: UIImage?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Photo with annotation overlay — precise positioning
                PhotoWithAnnotations(
                    item: item,
                    annotations: showAnnotations ? annotations.first : nil,
                    loadedImage: $loadedImage
                )
                .padding(.horizontal, 12)
                .padding(.top, 8)

                // Action bar
                HStack(spacing: 10) {
                    if !annotations.isEmpty {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { showAnnotations.toggle() }
                        } label: {
                            HStack(spacing: 5) {
                                Image(systemName: showAnnotations ? "eye.fill" : "eye.slash")
                                    .font(.system(size: 11))
                                Text(showAnnotations ? "Hide" : "Show")
                                    .font(.system(size: 12, weight: .medium))
                            }
                            .foregroundStyle(showAnnotations ? Color.brandPrimary : Color.secondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(showAnnotations ? Color.brandPrimary.opacity(0.08) : Color(.systemGray6))
                            .clipShape(Capsule())
                        }
                    }

                    Button {
                        showAnnotationEditor = true
                    } label: {
                        HStack(spacing: 5) {
                            Image(systemName: "pencil.tip.crop.circle")
                                .font(.system(size: 11))
                            Text(annotations.isEmpty ? "Annotate" : "Edit")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 7)
                        .background(Color.brandPrimary)
                        .clipShape(Capsule())
                    }

                    Spacer()

                    if let a = annotations.first {
                        Text("v\(a.version)")
                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                            .foregroundStyle(.quaternary)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 16)

                // Metadata card
                VStack(alignment: .leading, spacing: 0) {
                    MetadataSection(item: item)
                }
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: .black.opacity(0.04), radius: 12, y: 4)
                .padding(.horizontal, 12)
                .padding(.bottom, 20)
            }
        }
        .background(Color(.systemGroupedBackground))
        .navigationTitle("Photo Detail")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Done") { dismiss() }
            }
        }
        .sheet(isPresented: $showAnnotationEditor, onDismiss: { Task { await loadAnnotations() } }) {
            if let image = loadedImage {
                AnnotationEditorView(image: image, mediaId: item.id)
            } else if let urlString = item.preview_url ?? item.thumbnail_url,
                      let url = URL(string: urlString) {
                AsyncAnnotationLoader(url: url, mediaId: item.id)
            }
        }
        .task { await loadAnnotations() }
    }

    private func loadAnnotations() async {
        do { annotations = try await APIClient.shared.get("media/\(item.id)/annotations") } catch {}
    }
}

// MARK: - Photo With Annotation Overlay

struct PhotoWithAnnotations: View {
    let item: MediaItem
    let annotations: AnnotationResponse?
    @Binding var loadedImage: UIImage?

    @State private var uiImage: UIImage?

    var body: some View {
        Group {
            if let uiImage {
                // Image with annotation overlay as .overlay
                // The overlay is EXACTLY the rendered image frame
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .overlay {
                        if let annotation = annotations {
                            AnnotationOverlayCanvas(annotationData: annotation.annotation_data)
                        }
                    }
            } else if let urlString = item.preview_url ?? item.thumbnail_url {
                // Loading state
                Rectangle()
                    .fill(Color(.systemGray6))
                    .aspectRatio(4.0/3.0, contentMode: .fit)
                    .overlay { ProgressView() }
            } else {
                Rectangle()
                    .fill(Color(.systemGray6))
                    .aspectRatio(4.0/3.0, contentMode: .fit)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.system(size: 36))
                            .foregroundStyle(.quaternary)
                    }
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.08), radius: 16, y: 6)
        .task { await loadImage() }
    }

    private func loadImage() async {
        guard let urlString = item.preview_url ?? item.thumbnail_url,
              let url = URL(string: urlString) else { return }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let img = UIImage(data: data) {
                uiImage = img
                loadedImage = img
            }
        } catch {}
    }
}

// MARK: - Annotation Overlay Canvas
// Used as .overlay on the image — coordinate space matches the image exactly

struct AnnotationOverlayCanvas: View {
    let annotationData: AnnotationResponse.AnnotationData

    var body: some View {
        GeometryReader { geo in
            // geo.size IS the rendered image size (because this is an overlay)
            let viewW = geo.size.width
            let viewH = geo.size.height
            let canvasW = annotationData.canvas_width ?? 1
            let canvasH = annotationData.canvas_height ?? 1
            // Scale from pixel coords to view coords
            let sx = viewW / canvasW
            let sy = viewH / canvasH
            let lineScale = min(viewW, viewH) / 400

            Canvas { ctx, _ in
                guard let elements = annotationData.elements else { return }

                for element in elements {
                    let type = element["type"]?.stringValue ?? ""
                    let colorName = element["color"]?.stringValue ?? "red"
                    let lw = (element["width"]?.doubleValue ?? 3.0) * max(lineScale, 0.5)
                    let color = colorFor(colorName)

                    switch type {
                    case "arrow":
                        guard let x1 = element["x1"]?.doubleValue, let y1 = element["y1"]?.doubleValue,
                              let x2 = element["x2"]?.doubleValue, let y2 = element["y2"]?.doubleValue else { continue }
                        let p1 = CGPoint(x: x1 * sx, y: y1 * sy)
                        let p2 = CGPoint(x: x2 * sx, y: y2 * sy)
                        var path = Path(); path.move(to: p1); path.addLine(to: p2)
                        ctx.stroke(path, with: .color(color), style: StrokeStyle(lineWidth: lw, lineCap: .round))
                        let angle = Double(atan2(p2.y - p1.y, p2.x - p1.x))
                        let hl = Double(8 + lw * 2)
                        var head = Path()
                        head.move(to: p2)
                        head.addLine(to: CGPoint(x: Double(p2.x) - hl * cos(angle - 0.45), y: Double(p2.y) - hl * sin(angle - 0.45)))
                        head.move(to: p2)
                        head.addLine(to: CGPoint(x: Double(p2.x) - hl * cos(angle + 0.45), y: Double(p2.y) - hl * sin(angle + 0.45)))
                        ctx.stroke(head, with: .color(color), style: StrokeStyle(lineWidth: lw, lineCap: .round))

                    case "rectangle":
                        guard let x = element["x"]?.doubleValue, let y = element["y"]?.doubleValue,
                              let w = element["w"]?.doubleValue, let h = element["h"]?.doubleValue else { continue }
                        let rect = CGRect(x: x * sx, y: y * sy, width: w * sx, height: h * sy)
                        ctx.stroke(Path(roundedRect: rect, cornerRadius: 2), with: .color(color), lineWidth: lw)

                    case "circle":
                        guard let cx = element["cx"]?.doubleValue, let cy = element["cy"]?.doubleValue,
                              let rx = element["rx"]?.doubleValue, let ry = element["ry"]?.doubleValue else { continue }
                        let rect = CGRect(x: (cx - rx) * sx, y: (cy - ry) * sy, width: rx * 2 * sx, height: ry * 2 * sy)
                        ctx.stroke(Path(ellipseIn: rect), with: .color(color), lineWidth: lw)

                    case "text":
                        guard let x = element["x"]?.doubleValue, let y = element["y"]?.doubleValue,
                              let text = element["text"]?.stringValue else { continue }
                        let fontSize = (element["fontSize"]?.doubleValue ?? 24) * max(lineScale, 0.5)
                        ctx.draw(
                            Text(text).font(.system(size: fontSize, weight: .bold)).foregroundStyle(color),
                            at: CGPoint(x: x * sx, y: y * sy), anchor: .topLeading
                        )

                    default: break
                }
            }
        }
        .allowsHitTesting(false)
        } // GeometryReader
    }

    private func colorFor(_ name: String) -> Color {
        switch name {
        case "red": return .red
        case "orange": return .orange
        case "yellow": return .yellow
        case "green": return .green
        case "blue": return .blue
        case "white": return .white
        case "black": return .black
        default: return .red
        }
    }
}

// MARK: - Metadata Section

struct MetadataSection: View {
    let item: MediaItem

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                Text("Details")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(0.5)
                Spacer()
                Text(item.status.capitalized)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(item.status == "ready" ? Color.brandSuccess : Color.brandWarning)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background((item.status == "ready" ? Color.brandSuccess : Color.brandWarning).opacity(0.1))
                    .clipShape(Capsule())
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 12)

            Divider().padding(.horizontal, 16)

            VStack(spacing: 0) {
                if let fn = item.original_filename {
                    MetaRow(icon: "doc", label: "File", value: fn)
                }
                MetaRow(icon: "photo", label: "Type", value: item.media_type.capitalized)
                if let room = item.room_label, !room.isEmpty {
                    MetaRow(icon: "door.left.hand.open", label: "Room", value: room)
                }
                if let area = item.area_label, !area.isEmpty {
                    MetaRow(icon: "square.grid.2x2", label: "Area", value: area)
                }
                if let lat = item.latitude, let lng = item.longitude {
                    MetaRow(icon: "location", label: "GPS", value: String(format: "%.5f, %.5f", lat, lng))
                }
                if let captured = item.captured_at {
                    MetaRow(icon: "clock", label: "Captured", value: formatDate(captured))
                }
            }

            if let notes = item.notes, !notes.isEmpty {
                Divider().padding(.horizontal, 16)
                VStack(alignment: .leading, spacing: 6) {
                    Label("Notes", systemImage: "note.text")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                    Text(notes)
                        .font(.system(size: 14))
                        .foregroundStyle(.primary)
                }
                .padding(16)
            }

            Spacer().frame(height: 8)
        }
    }

    private func formatDate(_ iso: String) -> String {
        let clean = String(iso.prefix(19))
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
        if let date = f.date(from: clean) {
            let df = DateFormatter()
            df.dateStyle = .medium
            df.timeStyle = .short
            return df.string(from: date)
        }
        return clean
    }
}

struct MetaRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundStyle(Color.brandPrimary)
                .frame(width: 20)
            Text(label)
                .font(.system(size: 13))
                .foregroundStyle(.secondary)
                .frame(width: 60, alignment: .leading)
            Text(value)
                .font(.system(size: 13))
                .foregroundStyle(.primary)
                .lineLimit(1)
            Spacer()
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
    }
}

// MARK: - Async Annotation Loader

struct AsyncAnnotationLoader: View {
    let url: URL
    let mediaId: String
    @State private var loadedImage: UIImage?

    var body: some View {
        Group {
            if let image = loadedImage {
                AnnotationEditorView(image: image, mediaId: mediaId)
            } else {
                VStack(spacing: 12) {
                    ProgressView()
                    Text("Loading image...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .task {
                    do {
                        let (data, _) = try await URLSession.shared.data(from: url)
                        loadedImage = UIImage(data: data)
                    } catch {}
                }
            }
        }
    }
}

// Keep DetailRow for backward compat
struct DetailRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack(alignment: .top) {
            Text(label).font(.caption).foregroundStyle(.secondary).frame(width: 80, alignment: .leading)
            Text(value).font(.subheadline)
        }
    }
}
