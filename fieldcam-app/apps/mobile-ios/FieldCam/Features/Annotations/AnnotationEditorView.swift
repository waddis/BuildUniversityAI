import SwiftUI

// MARK: - API Payload

struct AnnotationPayload: Encodable {
    let elements: [[String: AnnotationValue]]
    let canvas_width: Double
    let canvas_height: Double
}

struct AnnotationValue: Encodable {
    private let _encode: (Encoder) throws -> Void
    init(_ value: Any) {
        _encode = { encoder in
            var c = encoder.singleValueContainer()
            if let v = value as? String { try c.encode(v) }
            else if let v = value as? Double { try c.encode(v) }
            else if let v = value as? CGFloat { try c.encode(Double(v)) }
            else if let v = value as? Int { try c.encode(v) }
            else { try c.encode(String(describing: value)) }
        }
    }
    func encode(to encoder: Encoder) throws { try _encode(encoder) }
}

// MARK: - Element Model

struct AnnotationElement: Identifiable, Equatable {
    let id: UUID
    var type: ElementType
    /// Normalized 0...1 coordinates relative to image
    var p1: CGPoint
    var p2: CGPoint
    var color: String
    var lineWidth: CGFloat

    enum ElementType: String, CaseIterable {
        case select, arrow, rectangle, circle, text
    }

    static func == (lhs: AnnotationElement, rhs: AnnotationElement) -> Bool {
        lhs.id == rhs.id
    }

    /// Center point (normalized)
    var center: CGPoint {
        CGPoint(x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2)
    }

    /// Move by delta (normalized)
    mutating func translate(dx: CGFloat, dy: CGFloat) {
        p1.x += dx; p1.y += dy
        p2.x += dx; p2.y += dy
    }
}

// MARK: - Annotation Editor

struct AnnotationEditorView: View {
    let image: UIImage
    let mediaId: String
    @Environment(\.dismiss) private var dismiss

    @State private var elements: [AnnotationElement] = []
    @State private var undoStack: [[AnnotationElement]] = []
    @State private var selectedId: UUID?
    @State private var currentTool: AnnotationElement.ElementType = .arrow
    @State private var currentColor = "red"
    @State private var lineWidth: CGFloat = 3
    @State private var dragStart: CGPoint?
    @State private var dragCurrent: CGPoint?
    @State private var moveStart: CGPoint?
    @State private var saving = false
    @State private var saveError: String?
    @State private var isLoading = true

    // Zoom
    @State private var zoomScale: CGFloat = 1.0
    @State private var lastZoomScale: CGFloat = 1.0
    @State private var panOffset: CGSize = .zero
    @State private var lastPanOffset: CGSize = .zero

    let drawTools: [AnnotationElement.ElementType] = [.arrow, .rectangle, .circle]
    let colors: [(String, Color)] = [
        ("red", .red), ("orange", .orange), ("yellow", .yellow),
        ("green", .green), ("blue", .blue), ("white", .white)
    ]

    var isSelectMode: Bool { currentTool == .select }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Zoomable image + canvas
                zoomableCanvas
                    .background(.black)
                    .clipped()

                // Error banner
                if let err = saveError {
                    HStack(spacing: 6) {
                        Image(systemName: "exclamationmark.triangle.fill").font(.caption)
                        Text(err).font(.caption).lineLimit(1)
                        Spacer()
                        Button("Retry") { saveAnnotation() }.font(.caption.bold())
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(.red)
                }

                // Selected element bar
                if let selId = selectedId, elements.contains(where: { $0.id == selId }) {
                    selectedBar
                }

                // Toolbar
                toolbarContent
            }
            .navigationTitle("Annotate")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(.secondary)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveAnnotation() }
                        .fontWeight(.semibold)
                        .disabled(saving || elements.isEmpty)
                }
            }
            .task { await loadExisting() }
        }
    }

    // MARK: - Zoomable Canvas

    private var zoomableCanvas: some View {
        Image(uiImage: image)
            .resizable()
            .aspectRatio(contentMode: .fit)
            .overlay {
                GeometryReader { geo in
                    canvasLayer(viewSize: geo.size)
                }
            }
            .scaleEffect(zoomScale)
            .offset(panOffset)
            .gesture(pinchGesture)
            .gesture(isSelectMode ? nil : panGesture)
    }

    private var pinchGesture: some Gesture {
        MagnificationGesture()
            .onChanged { value in
                zoomScale = max(1.0, min(lastZoomScale * value, 5.0))
            }
            .onEnded { value in
                lastZoomScale = zoomScale
                if zoomScale < 1.05 {
                    withAnimation(.spring(duration: 0.3)) {
                        zoomScale = 1.0
                        lastZoomScale = 1.0
                        panOffset = .zero
                        lastPanOffset = .zero
                    }
                }
            }
    }

    private var panGesture: some Gesture {
        DragGesture()
            .onChanged { v in
                guard zoomScale > 1.05 else { return }
                panOffset = CGSize(
                    width: lastPanOffset.width + v.translation.width,
                    height: lastPanOffset.height + v.translation.height
                )
            }
            .onEnded { _ in
                lastPanOffset = panOffset
            }
    }

    // MARK: - Canvas Layer

    private func canvasLayer(viewSize: CGSize) -> some View {
        Canvas { ctx, size in
            for el in elements {
                let isSelected = el.id == selectedId
                drawElement(ctx: &ctx, el: el, in: size, selected: isSelected)
            }
            // Live preview for drawing
            if !isSelectMode, let s = dragStart, let c = dragCurrent {
                let preview = AnnotationElement(
                    id: UUID(), type: currentTool,
                    p1: normalize(s, in: viewSize),
                    p2: normalize(c, in: viewSize),
                    color: currentColor, lineWidth: lineWidth
                )
                drawElement(ctx: &ctx, el: preview, in: size, selected: false)
            }
        }
        .contentShape(Rectangle())
        .gesture(canvasGesture(viewSize: viewSize))
    }

    private func canvasGesture(viewSize: CGSize) -> some Gesture {
        DragGesture(minimumDistance: isSelectMode ? 0 : 3)
            .onChanged { v in
                if isSelectMode {
                    handleSelectDrag(v, viewSize: viewSize)
                } else {
                    if dragStart == nil { dragStart = v.startLocation }
                    dragCurrent = v.location
                }
            }
            .onEnded { v in
                if isSelectMode {
                    handleSelectEnd(v, viewSize: viewSize)
                } else {
                    guard let start = dragStart else { return }
                    undoStack.append(elements)
                    elements.append(AnnotationElement(
                        id: UUID(), type: currentTool,
                        p1: normalize(start, in: viewSize),
                        p2: normalize(v.location, in: viewSize),
                        color: currentColor, lineWidth: lineWidth
                    ))
                    dragStart = nil
                    dragCurrent = nil
                }
            }
    }

    // MARK: - Select & Move

    private func handleSelectDrag(_ v: DragGesture.Value, viewSize: CGSize) {
        let pt = normalize(v.location, in: viewSize)

        if moveStart == nil {
            // First touch — try to select
            moveStart = pt
            if let hit = hitTest(pt) {
                selectedId = hit.id
            } else {
                selectedId = nil
            }
        }

        // If we have a selection, move it
        if let selId = selectedId, let start = moveStart {
            let dx = pt.x - start.x
            let dy = pt.y - start.y
            if let idx = elements.firstIndex(where: { $0.id == selId }) {
                elements[idx].translate(dx: dx, dy: dy)
            }
            moveStart = pt
        }
    }

    private func handleSelectEnd(_ v: DragGesture.Value, viewSize: CGSize) {
        moveStart = nil
    }

    private func hitTest(_ pt: CGPoint, threshold: CGFloat = 0.04) -> AnnotationElement? {
        // Search in reverse order (topmost first)
        for el in elements.reversed() {
            let cx = (el.p1.x + el.p2.x) / 2
            let cy = (el.p1.y + el.p2.y) / 2
            let dx = abs(pt.x - cx)
            let dy = abs(pt.y - cy)
            let hw = abs(el.p2.x - el.p1.x) / 2 + threshold
            let hh = abs(el.p2.y - el.p1.y) / 2 + threshold
            if dx <= max(hw, threshold) && dy <= max(hh, threshold) {
                return el
            }
        }
        return nil
    }

    // MARK: - Drawing

    private func normalize(_ pt: CGPoint, in size: CGSize) -> CGPoint {
        CGPoint(x: pt.x / max(size.width, 1), y: pt.y / max(size.height, 1))
    }

    private func denormalize(_ pt: CGPoint, in size: CGSize) -> CGPoint {
        CGPoint(x: pt.x * size.width, y: pt.y * size.height)
    }

    private func drawElement(ctx: inout GraphicsContext, el: AnnotationElement, in size: CGSize, selected: Bool) {
        let p1 = denormalize(el.p1, in: size)
        let p2 = denormalize(el.p2, in: size)
        let refScale = min(size.width, size.height) / 400
        let lw = el.lineWidth * max(refScale, 0.5)
        let color = resolveColor(el.color)

        // Selection highlight
        if selected {
            let selRect = CGRect(
                x: min(p1.x, p2.x) - 4, y: min(p1.y, p2.y) - 4,
                width: abs(p2.x - p1.x) + 8, height: abs(p2.y - p1.y) + 8
            )
            ctx.stroke(
                Path(roundedRect: selRect, cornerRadius: 3),
                with: .color(.brandPrimary.opacity(0.6)),
                style: StrokeStyle(lineWidth: 1.5, dash: [5, 3])
            )
        }

        switch el.type {
        case .arrow:
            var line = Path(); line.move(to: p1); line.addLine(to: p2)
            ctx.stroke(line, with: .color(color), style: StrokeStyle(lineWidth: lw, lineCap: .round))
            let angle = Double(atan2(p2.y - p1.y, p2.x - p1.x))
            let hl = Double(8 + lw * 2)
            var head = Path()
            head.move(to: p2)
            head.addLine(to: CGPoint(x: Double(p2.x) - hl * cos(angle - 0.45), y: Double(p2.y) - hl * sin(angle - 0.45)))
            head.move(to: p2)
            head.addLine(to: CGPoint(x: Double(p2.x) - hl * cos(angle + 0.45), y: Double(p2.y) - hl * sin(angle + 0.45)))
            ctx.stroke(head, with: .color(color), style: StrokeStyle(lineWidth: lw, lineCap: .round))

        case .rectangle:
            let r = CGRect(x: min(p1.x, p2.x), y: min(p1.y, p2.y), width: abs(p2.x - p1.x), height: abs(p2.y - p1.y))
            ctx.stroke(Path(roundedRect: r, cornerRadius: 2), with: .color(color), lineWidth: lw)

        case .circle:
            let r = CGRect(x: min(p1.x, p2.x), y: min(p1.y, p2.y), width: abs(p2.x - p1.x), height: abs(p2.y - p1.y))
            ctx.stroke(Path(ellipseIn: r), with: .color(color), lineWidth: lw)

        case .text:
            let fontSize = 18.0 * max(refScale, 0.5)
            ctx.draw(
                Text("Text").font(.system(size: fontSize, weight: .bold)).foregroundStyle(color),
                at: p1, anchor: .topLeading
            )

        case .select:
            break
        }
    }

    // MARK: - Selected Element Bar

    private var selectedBar: some View {
        HStack(spacing: 12) {
            Text("Selected")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.brandPrimary)

            Spacer()

            // Change color of selected
            ForEach(colors.prefix(4), id: \.0) { name, swiftColor in
                Button {
                    changeSelectedColor(name)
                } label: {
                    Circle().fill(swiftColor).frame(width: 20, height: 20)
                        .overlay {
                            if name == "white" {
                                Circle().strokeBorder(.gray.opacity(0.3), lineWidth: 1)
                            }
                        }
                }
            }

            Rectangle().fill(.quaternary).frame(width: 1, height: 20)

            // Duplicate
            Button {
                duplicateSelected()
            } label: {
                Image(systemName: "plus.square.on.square")
                    .font(.system(size: 15))
                    .foregroundStyle(Color.brandPrimary)
            }

            // Delete selected
            Button {
                deleteSelected()
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 15))
                    .foregroundStyle(.red)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }

    private func deleteSelected() {
        guard let selId = selectedId else { return }
        undoStack.append(elements)
        elements.removeAll { $0.id == selId }
        selectedId = nil
    }

    private func duplicateSelected() {
        guard let selId = selectedId,
              let el = elements.first(where: { $0.id == selId }) else { return }
        undoStack.append(elements)
        var copy = el
        copy = AnnotationElement(
            id: UUID(), type: el.type,
            p1: CGPoint(x: el.p1.x + 0.03, y: el.p1.y + 0.03),
            p2: CGPoint(x: el.p2.x + 0.03, y: el.p2.y + 0.03),
            color: el.color, lineWidth: el.lineWidth
        )
        elements.append(copy)
        selectedId = copy.id
    }

    private func changeSelectedColor(_ color: String) {
        guard let selId = selectedId,
              let idx = elements.firstIndex(where: { $0.id == selId }) else { return }
        undoStack.append(elements)
        elements[idx].color = color
    }

    // MARK: - Toolbar

    private var toolbarContent: some View {
        VStack(spacing: 10) {
            HStack(spacing: 0) {
                // Select tool
                Button { currentTool = .select; selectedId = nil } label: {
                    VStack(spacing: 3) {
                        Image(systemName: "hand.point.up.left")
                            .font(.system(size: 18))
                        Text("Select")
                            .font(.system(size: 9, weight: .medium))
                    }
                    .foregroundStyle(currentTool == .select ? Color.brandPrimary : Color.secondary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(currentTool == .select ? Color.brandPrimary.opacity(0.08) : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }

                ForEach(drawTools, id: \.rawValue) { tool in
                    Button { currentTool = tool; selectedId = nil } label: {
                        VStack(spacing: 3) {
                            Image(systemName: iconFor(tool))
                                .font(.system(size: 18))
                            Text(tool.rawValue.capitalized)
                                .font(.system(size: 9, weight: .medium))
                        }
                        .foregroundStyle(currentTool == tool ? Color.brandPrimary : Color.secondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                        .background(currentTool == tool ? Color.brandPrimary.opacity(0.08) : .clear)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                Rectangle().fill(.quaternary).frame(width: 1, height: 30).padding(.horizontal, 2)

                Button { undo() } label: {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.system(size: 16))
                        .foregroundStyle(undoStack.isEmpty ? Color(.quaternaryLabel) : .secondary)
                        .frame(width: 36, height: 40)
                }
                .disabled(undoStack.isEmpty)

                // Zoom reset
                if zoomScale > 1.05 {
                    Button {
                        withAnimation(.spring(duration: 0.3)) {
                            zoomScale = 1.0; lastZoomScale = 1.0
                            panOffset = .zero; lastPanOffset = .zero
                        }
                    } label: {
                        Image(systemName: "arrow.down.right.and.arrow.up.left")
                            .font(.system(size: 14))
                            .foregroundStyle(Color.brandPrimary)
                            .frame(width: 36, height: 40)
                    }
                }
            }
            .padding(.horizontal, 4)

            HStack(spacing: 6) {
                ForEach(colors, id: \.0) { name, swiftColor in
                    Button { currentColor = name } label: {
                        ZStack {
                            Circle().fill(swiftColor).frame(width: 26, height: 26)
                            if name == "white" { Circle().strokeBorder(.gray.opacity(0.3), lineWidth: 1).frame(width: 26, height: 26) }
                            if currentColor == name { Circle().strokeBorder(Color.brandPrimary, lineWidth: 2.5).frame(width: 30, height: 30) }
                        }
                    }
                }
                Spacer()
                // Element count
                Text("\(elements.count)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray6))
                    .clipShape(Capsule())
                HStack(spacing: 6) {
                    ForEach([2.0, 3.0, 5.0], id: \.self) { w in
                        Button { lineWidth = w } label: {
                            Circle()
                                .fill(lineWidth == w ? Color.brandPrimary : Color(.systemGray4))
                                .frame(width: 6 + w * 2.5, height: 6 + w * 2.5)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)

            // Zoom hint
            if zoomScale > 1.05 {
                Text("Pinch to zoom · \(Int(zoomScale * 100))%")
                    .font(.system(size: 10))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 8)
        .background(.ultraThinMaterial)
    }

    // MARK: - Helpers

    private func iconFor(_ tool: AnnotationElement.ElementType) -> String {
        switch tool {
        case .select: return "hand.point.up.left"
        case .arrow: return "arrow.up.right"
        case .rectangle: return "rectangle"
        case .circle: return "circle"
        case .text: return "textformat"
        }
    }

    private func resolveColor(_ name: String) -> Color {
        switch name {
        case "red": return .red; case "orange": return .orange; case "yellow": return .yellow
        case "green": return .green; case "blue": return .blue; case "white": return .white
        default: return .red
        }
    }

    private func undo() {
        guard let prev = undoStack.popLast() else { return }
        elements = prev
        selectedId = nil
    }

    // MARK: - Load Existing Annotations

    private func loadExisting() async {
        do {
            let existing: [AnnotationResponse] = try await APIClient.shared.get("media/\(mediaId)/annotations")
            if let latest = existing.first, let apiElements = latest.annotation_data.elements {
                let cw = latest.annotation_data.canvas_width ?? Double(image.size.width)
                let ch = latest.annotation_data.canvas_height ?? Double(image.size.height)
                var loaded: [AnnotationElement] = []
                for el in apiElements {
                    let type = el["type"]?.stringValue ?? "arrow"
                    let color = el["color"]?.stringValue ?? "red"
                    let lw = el["width"]?.doubleValue ?? 3
                    guard let parsed = parseElement(el, type: type, cw: cw, ch: ch, color: color, lw: lw) else { continue }
                    loaded.append(parsed)
                }
                elements = loaded
            }
        } catch {}
        isLoading = false
    }

    private func parseElement(_ el: [String: AnyCodableValue], type: String, cw: Double, ch: Double, color: String, lw: Double) -> AnnotationElement? {
        let elementType: AnnotationElement.ElementType
        var np1 = CGPoint.zero, np2 = CGPoint.zero

        switch type {
        case "arrow":
            elementType = .arrow
            guard let x1 = el["x1"]?.doubleValue, let y1 = el["y1"]?.doubleValue,
                  let x2 = el["x2"]?.doubleValue, let y2 = el["y2"]?.doubleValue else { return nil }
            np1 = CGPoint(x: x1 / cw, y: y1 / ch)
            np2 = CGPoint(x: x2 / cw, y: y2 / ch)
        case "rectangle":
            elementType = .rectangle
            guard let x = el["x"]?.doubleValue, let y = el["y"]?.doubleValue,
                  let w = el["w"]?.doubleValue, let h = el["h"]?.doubleValue else { return nil }
            np1 = CGPoint(x: x / cw, y: y / ch)
            np2 = CGPoint(x: (x + w) / cw, y: (y + h) / ch)
        case "circle":
            elementType = .circle
            guard let cx = el["cx"]?.doubleValue, let cy = el["cy"]?.doubleValue,
                  let rx = el["rx"]?.doubleValue, let ry = el["ry"]?.doubleValue else { return nil }
            np1 = CGPoint(x: (cx - rx) / cw, y: (cy - ry) / ch)
            np2 = CGPoint(x: (cx + rx) / cw, y: (cy + ry) / ch)
        default:
            return nil
        }

        return AnnotationElement(id: UUID(), type: elementType, p1: np1, p2: np2, color: color, lineWidth: CGFloat(lw))
    }

    // MARK: - Save

    private func saveAnnotation() {
        saving = true
        saveError = nil
        Task {
            do {
                let jsonBody = buildJSON()
                let url = APIClient.shared.baseURLForAnnotation(mediaId: mediaId)
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                if let token = APIClient.shared.token {
                    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                }
                request.httpBody = jsonBody
                let (data, response) = try await URLSession.shared.data(for: request)
                guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
                    let msg = String(data: data, encoding: .utf8) ?? "Unknown error"
                    throw NSError(domain: "", code: 0, userInfo: [NSLocalizedDescriptionKey: msg])
                }
                saving = false
                dismiss()
            } catch {
                saveError = error.localizedDescription
                saving = false
            }
        }
    }

    private func buildJSON() -> Data {
        let w = Double(image.size.width)
        let h = Double(image.size.height)
        var elArray: [[String: Any]] = []
        for el in elements {
            let px1 = Double(el.p1.x) * w, py1 = Double(el.p1.y) * h
            let px2 = Double(el.p2.x) * w, py2 = Double(el.p2.y) * h
            switch el.type {
            case .arrow:
                elArray.append(["type": "arrow", "x1": px1, "y1": py1, "x2": px2, "y2": py2, "color": el.color, "width": Double(el.lineWidth)])
            case .rectangle:
                elArray.append(["type": "rectangle", "x": min(px1, px2), "y": min(py1, py2), "w": abs(px2 - px1), "h": abs(py2 - py1), "color": el.color, "width": Double(el.lineWidth)])
            case .circle:
                elArray.append(["type": "circle", "cx": (px1 + px2) / 2, "cy": (py1 + py2) / 2, "rx": abs(px2 - px1) / 2, "ry": abs(py2 - py1) / 2, "color": el.color, "width": Double(el.lineWidth)])
            case .text:
                elArray.append(["type": "text", "x": px1, "y": py1, "text": "Text", "color": el.color, "fontSize": 24])
            case .select:
                break
            }
        }
        let payload: [String: Any] = ["elements": elArray, "canvas_width": w, "canvas_height": h]
        return (try? JSONSerialization.data(withJSONObject: payload)) ?? Data()
    }
}
