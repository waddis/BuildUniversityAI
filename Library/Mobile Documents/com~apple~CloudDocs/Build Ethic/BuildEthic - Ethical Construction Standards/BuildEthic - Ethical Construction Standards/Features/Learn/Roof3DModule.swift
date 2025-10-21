//
// Roof3DProcedural.swift
// Single-file, copy–paste drop-in: builds a clean, recognizable roof model procedurally
// with named, toggleable layers + readable labels (no external USDZ needed).
//
// Layers (node names):
//  FramingLayer, DeckingLayer, UnderlaymentLayer, FlashingLayer, CoveringLayer, VentilationLayer
//
// Usage:
//   NavigationLink("Open 3D Roof") { Roof3DProceduralView() }
//

import SwiftUI
import SceneKit

// MARK: - Public SwiftUI entry point
public struct Roof3DView: View {
    public struct XAPIConfig {
        public let endpoint: URL
        public let bearerToken: String
        public let launchId: String
        public init(endpoint: URL, bearerToken: String, launchId: String) {
            self.endpoint = endpoint
            self.bearerToken = bearerToken
            self.launchId = launchId
        }
    }

    @State private var showFraming = true
    @State private var showDecking = true
    @State private var showUnderlayment = true
    @State private var showFlashing = true
    @State private var showCovering = true
    @State private var showVentilation = true

    @State private var pickedLabel: String? = nil
    @State private var highlightNode: SCNNode?

    private let xapi: XAPIConfig?

    public init(xapi: XAPIConfig? = nil) {
        self.xapi = xapi
    }

    public var body: some View {
        ZStack(alignment: .bottom) {
            RoofSceneView(
                showFraming: showFraming,
                showDecking: showDecking,
                showUnderlayment: showUnderlayment,
                showFlashing: showFlashing,
                showCovering: showCovering,
                showVentilation: showVentilation,
                onPick: { name, node in
                    pickedLabel = name
                    highlightNode?.removeAllActions()
                    highlightNode?.geometry?.firstMaterial?.emission.contents = UIColor.black
                    highlightNode = node
                    let flash = SCNAction.customAction(duration: 0.8) { n, t in
                        let p = sin((t / 0.8) * .pi)
                        n.geometry?.firstMaterial?.emission.contents = UIColor.systemYellow.withAlphaComponent(0.3 + 0.5 * CGFloat(p))
                    }
                    node.runAction(SCNAction.repeat(flash, count: 2))
                    sendXAPI(verb: "interacted", objectId: "urn:ra:roof3d:pick:\(name)", name: name)
                }
            )
            .overlay(alignment: .topLeading) {
                if let label = pickedLabel {
                    Text(label)
                        .font(.caption.weight(.bold))
                        .padding(8)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                        .padding(12)
                        .transition(.opacity)
                }
            }

            ControlsBar(
                showFraming: $showFraming,
                showDecking: $showDecking,
                showUnderlayment: $showUnderlayment,
                showFlashing: $showFlashing,
                showCovering: $showCovering,
                showVentilation: $showVentilation
            )
            .padding(.bottom, 10)
        }
        .onAppear { sendXAPI(verb: "experienced", objectId: "urn:ra:activity:roof3d", name: "Roof Layer Visualization") }
        .navigationTitle("3D Roof Model")
    }

    private func sendXAPI(verb: String, objectId: String, name: String) {
        guard let xapi else { return }
        Task {
            let payload: [String: Any] = [
                "id": UUID().uuidString,
                "launchId": xapi.launchId,
                "actor": ["name": "Learner", "mbox": "mailto:unknown@example.com"],
                "verb": ["id": "http://adlnet.gov/expapi/verbs/\(verb)", "display": ["en-US": verb]],
                "object": ["id": objectId, "definition": ["name": ["en-US": name]]],
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
            let data = try JSONSerialization.data(withJSONObject: payload, options: [])
            var req = URLRequest(url: xapi.endpoint)
            req.httpMethod = "POST"
            req.httpBody = data
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.setValue("Bearer \(xapi.bearerToken)", forHTTPHeaderField: "Authorization")
            _ = try? await URLSession.shared.data(for: req)
        }
    }
}

// MARK: - Controls Bar
fileprivate struct ControlsBar: View {
    @Binding var showFraming: Bool
    @Binding var showDecking: Bool
    @Binding var showUnderlayment: Bool
    @Binding var showFlashing: Bool
    @Binding var showCovering: Bool
    @Binding var showVentilation: Bool

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                TogglePill(title: "Framing", isOn: $showFraming)
                TogglePill(title: "Deck", isOn: $showDecking)
                TogglePill(title: "Underl.", isOn: $showUnderlayment)
                TogglePill(title: "Flashing", isOn: $showFlashing)
                TogglePill(title: "Covering", isOn: $showCovering)
                TogglePill(title: "Vent", isOn: $showVentilation)
            }
            .padding(10)
            .background(.ultraThinMaterial, in: Capsule())
            .padding(.horizontal)
        }
    }
}

fileprivate struct TogglePill: View {
    let title: String
    @Binding var isOn: Bool
    var body: some View {
        Button(action: { isOn.toggle() }) {
            HStack(spacing: 6) {
                Circle()
                    .fill(isOn ? Color.accentColor : Color.secondary.opacity(0.4))
                    .frame(width: 8, height: 8)
                Text(title)
                    .font(.footnote.weight(.semibold))
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isOn ? Color.accentColor.opacity(0.15) : Color.secondary.opacity(0.12), in: Capsule())
            .overlay(Capsule().stroke(isOn ? Color.accentColor : Color.secondary.opacity(0.4), lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - SceneKit Bridge + Procedural Roof
fileprivate struct RoofSceneView: UIViewRepresentable {
    let showFraming: Bool
    let showDecking: Bool
    let showUnderlayment: Bool
    let showFlashing: Bool
    let showCovering: Bool
    let showVentilation: Bool
    let onPick: (String, SCNNode) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(onPick: onPick) }

    func makeUIView(context: Context) -> SCNView {
        let view = SCNView()
        view.backgroundColor = UIColor.systemBackground
        view.allowsCameraControl = true
        view.autoenablesDefaultLighting = true
        view.antialiasingMode = .multisampling2X
        view.preferredFramesPerSecond = 30

        let scene = SCNScene()
        view.scene = scene

        // Camera
        let cam = SCNNode()
        cam.camera = SCNCamera()
        cam.camera?.fieldOfView = 45
        cam.position = SCNVector3(0, 0.7, 2.6)
        scene.rootNode.addChildNode(cam)

        // Light
        let key = SCNNode()
        key.light = SCNLight()
        key.light?.type = .directional
        key.eulerAngles = SCNVector3(-Float.pi/3, Float.pi/5, 0)
        scene.rootNode.addChildNode(key)

        let fill = SCNNode()
        fill.light = SCNLight()
        fill.light?.type = .ambient
        fill.light?.color = UIColor(white: 0.5, alpha: 1)
        scene.rootNode.addChildNode(fill)

        // Procedural roof model
        let roof = buildRoofSystem()
        scene.rootNode.addChildNode(roof)

        // Slow spin for clarity
        let spin = SCNAction.repeatForever(SCNAction.rotateBy(x: 0, y: CGFloat(Float.pi/8), z: 0, duration: 8))
        roof.runAction(spin)

        // Tap gesture
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        view.addGestureRecognizer(tap)
        context.coordinator.view = view

        // Initial visibility set
        applyVisibility(in: view)

        return view
    }

    func updateUIView(_ view: SCNView, context: Context) {
        applyVisibility(in: view)
    }

    private func applyVisibility(in view: SCNView) {
        guard let root = view.scene?.rootNode.childNode(withName: "RoofSystem", recursively: true) else { return }
        setVisibility(root: root, "FramingLayer", showFraming)
        setVisibility(root: root, "DeckingLayer", showDecking)
        setVisibility(root: root, "UnderlaymentLayer", showUnderlayment)
        setVisibility(root: root, "FlashingLayer", showFlashing)
        setVisibility(root: root, "CoveringLayer", showCovering)
        setVisibility(root: root, "VentilationLayer", showVentilation)
        // Keep labels tied to parents
        toggleLabel(root: root, parentName: "FramingLayer")
        toggleLabel(root: root, parentName: "DeckingLayer")
        toggleLabel(root: root, parentName: "UnderlaymentLayer")
        toggleLabel(root: root, parentName: "FlashingLayer")
        toggleLabel(root: root, parentName: "CoveringLayer")
        toggleLabel(root: root, parentName: "VentilationLayer")
    }

    private func setVisibility(root: SCNNode, _ name: String, _ visible: Bool) {
        if let node = root.childNode(withName: name, recursively: true) {
            node.isHidden = !visible
        }
    }

    private func toggleLabel(root: SCNNode, parentName: String) {
        guard let parent = root.childNode(withName: parentName, recursively: true),
              let label = parent.childNode(withName: "Label", recursively: false) else { return }
        label.isHidden = parent.isHidden
    }

    // Build a clean, recognizable gable roof with distinct layers
    private func buildRoofSystem() -> SCNNode {
        let root = SCNNode()
        root.name = "RoofSystem"

        // Scale reference: width ~1.6m, depth ~1.0m, slope ~28° (approx 6:12)
        let houseWidth: CGFloat = 1.6
        let houseDepth: CGFloat = 1.0
        let overhang: CGFloat = 0.05
        let deckThickness: CGFloat = 0.012
        let underThickness: CGFloat = 0.004
        let shingleThickness: CGFloat = 0.006
        let ridgeVentW: CGFloat = 0.08
        let ridgeVentH: CGFloat = 0.02
        let pitchRise: CGFloat = 0.38 // roof ridge height

        // Materials
        let wood = SCNMaterial()
        wood.diffuse.contents = UIColor(red: 0.86, green: 0.72, blue: 0.50, alpha: 1)

        let ply = SCNMaterial()
        ply.diffuse.contents = UIColor(red: 0.88, green: 0.78, blue: 0.58, alpha: 1)

        let felt = SCNMaterial()
        felt.diffuse.contents = UIColor(white: 0.18, alpha: 1)

        let metal = SCNMaterial()
        metal.diffuse.contents = UIColor(white: 0.85, alpha: 1)
        metal.metalness.contents = 0.8
        metal.roughness.contents = 0.2

        let shingles = SCNMaterial()
        shingles.diffuse.contents = UIColor(red: 0.18, green: 0.20, blue: 0.22, alpha: 1)

        let labelMat = SCNMaterial()
        labelMat.diffuse.contents = UIColor.white
        labelMat.emission.contents = UIColor.white

        // ----- FramingLayer -----
        let framing = SCNNode()
        framing.name = "FramingLayer"
        // Base joists
        let joistCount = 6
        for i in 0..<joistCount {
            let x = (-houseWidth/2) + CGFloat(i) * (houseWidth / CGFloat(joistCount - 1))
            let beam = SCNBox(width: 0.04, height: 0.03, length: houseDepth, chamferRadius: 0)
            beam.materials = [wood]
            let n = SCNNode(geometry: beam)
            n.position = SCNVector3(x, -0.10, 0)
            n.name = "Framing_Joist_\(i)"
            framing.addChildNode(n)
        }
        // Rafters (simple) – left/right planes rotated
        let rafterCount = 7
        for i in 0..<rafterCount {
            let z = (-houseDepth/2) + CGFloat(i) * (houseDepth / CGFloat(rafterCount - 1))
            let rafterLen = sqrt(pow(houseWidth/2 + overhang, 2) + pow(pitchRise, 2))
            let rafter = SCNBox(width: 0.04, height: 0.03, length: rafterLen, chamferRadius: 0)
            rafter.materials = [wood]
            // Left
            let left = SCNNode(geometry: rafter)
            left.pivot = SCNMatrix4MakeTranslation(0, 0, Float(-rafterLen/2))
            left.eulerAngles.x = Float(-atan(pitchRise / (houseWidth/2 + overhang)))
            left.position = SCNVector3(0, 0, z)
            left.position.x = Float(-0.02 - houseWidth/2)
            left.name = "Framing_RafterL_\(i)"
            framing.addChildNode(left)
            // Right
            let right = left.clone()
            right.eulerAngles.y = Float.pi
            right.position.x = Float(0.02 + houseWidth/2)
            right.name = "Framing_RafterR_\(i)"
            framing.addChildNode(right)
        }
        framing.addChildNode(makeBillboardLabel("FramingLayer", color: .systemOrange, y: 0.15))

        // ----- DeckingLayer -----
        let decking = SCNNode()
        decking.name = "DeckingLayer"
        // Two sloped planes (thin boxes) for deck
        let slopeAngle = atan(pitchRise / (houseWidth/2 + overhang))
        let deckLen = sqrt(pow(houseWidth/2 + overhang, 2) + pow(pitchRise, 2))
        func makeDeck(side: CGFloat) -> SCNNode {
            let box = SCNBox(width: deckThickness, height: houseDepth + 2*overhang, length: deckLen, chamferRadius: 0)
            box.materials = [ply]
            let n = SCNNode(geometry: box)
            n.eulerAngles.z = Float(side > 0 ? -slopeAngle : slopeAngle)
            n.position = SCNVector3(Float(side*(houseWidth/4)), 0.0, 0.0)
            n.pivot = SCNMatrix4MakeTranslation(Float(deckThickness/2), 0, Float(-deckLen/2))
            n.name = side > 0 ? "Deck_Right" : "Deck_Left"
            return n
        }
        decking.addChildNode(makeDeck(side: -1))
        decking.addChildNode(makeDeck(side: 1))
        decking.addChildNode(makeBillboardLabel("DeckingLayer", color: .systemBrown, y: 0.24))

        // ----- UnderlaymentLayer -----
        let under = SCNNode()
        under.name = "UnderlaymentLayer"
        func makeUnder(side: CGFloat) -> SCNNode {
            let box = SCNBox(width: underThickness, height: houseDepth + 2*overhang, length: deckLen, chamferRadius: 0)
            box.materials = [felt]
            let n = SCNNode(geometry: box)
            n.eulerAngles.z = Float(side > 0 ? -slopeAngle : slopeAngle)
            n.position = SCNVector3(Float(side*(houseWidth/4)), 0.01, 0.0) // slightly above deck
            n.pivot = SCNMatrix4MakeTranslation(Float(underThickness/2), 0, Float(-deckLen/2))
            n.name = side > 0 ? "Under_Right" : "Under_Left"
            return n
        }
        under.addChildNode(makeUnder(side: -1))
        under.addChildNode(makeUnder(side: 1))
        under.addChildNode(makeBillboardLabel("UnderlaymentLayer", color: .darkGray, y: 0.30))

        // ----- FlashingLayer -----
        let flashing = SCNNode()
        flashing.name = "FlashingLayer"
        // Drip edges along eaves (front/back) and rakes (sides) - simple thin metallic strips
        func strip(size: (w: CGFloat, h: CGFloat, l: CGFloat), pos: SCNVector3, eul: SCNVector3) -> SCNNode {
            let g = SCNBox(width: size.w, height: size.h, length: size.l, chamferRadius: 0)
            g.materials = [metal]
            let n = SCNNode(geometry: g)
            n.position = pos
            n.eulerAngles = eul
            return n
        }
        let eaveLen = deckLen
        let rakeLen = pitchRise / sin(slopeAngle) + houseDepth + 2*overhang
        // Eaves (front/back)
        flashing.addChildNode(strip(size: (0.004, 0.01, eaveLen),
                                    pos: SCNVector3(0, -0.01, Float(-houseDepth/2 - overhang + rakeLen*0.5 - rakeLen + 0.02)),
                                    eul: SCNVector3(0, 0, 0)))
        flashing.addChildNode(strip(size: (0.004, 0.01, eaveLen),
                                    pos: SCNVector3(0, -0.01, Float(houseDepth/2 + overhang - 0.02)),
                                    eul: SCNVector3(0, 0, 0)))
        // Rakes (left/right)
        flashing.addChildNode(strip(size: (0.004, 0.01, houseDepth + 2*overhang),
                                    pos: SCNVector3(Float(-houseWidth/2 - overhang), 0.06, 0),
                                    eul: SCNVector3(0, 0, 0)))
        flashing.addChildNode(strip(size: (0.004, 0.01, houseDepth + 2*overhang),
                                    pos: SCNVector3(Float(houseWidth/2 + overhang), 0.06, 0),
                                    eul: SCNVector3(0, 0, 0)))
        flashing.addChildNode(makeBillboardLabel("FlashingLayer", color: .systemTeal, y: 0.34))

        // ----- CoveringLayer (Shingles) -----
        let cover = SCNNode()
        cover.name = "CoveringLayer"
        func makeCover(side: CGFloat) -> SCNNode {
            let box = SCNBox(width: shingleThickness, height: houseDepth + 2*overhang, length: deckLen, chamferRadius: 0)
            box.materials = [shingles]
            let n = SCNNode(geometry: box)
            n.eulerAngles.z = Float(side > 0 ? -slopeAngle : slopeAngle)
            n.position = SCNVector3(Float(side*(houseWidth/4)), 0.02, 0.0) // above underlayment
            n.pivot = SCNMatrix4MakeTranslation(Float(shingleThickness/2), 0, Float(-deckLen/2))
            n.name = side > 0 ? "Cover_Right" : "Cover_Left"
            return n
        }
        cover.addChildNode(makeCover(side: -1))
        cover.addChildNode(makeCover(side: 1))
        cover.addChildNode(makeBillboardLabel("CoveringLayer", color: .black, y: 0.38))

        // ----- VentilationLayer (Ridge Vent) -----
        let vent = SCNNode()
        vent.name = "VentilationLayer"
        let ventGeom = SCNBox(width: ridgeVentW, height: ridgeVentH, length: houseDepth * 0.8, chamferRadius: 0.003)
        let ventMat = SCNMaterial()
        ventMat.diffuse.contents = UIColor(white: 0.1, alpha: 1)
        ventGeom.materials = [ventMat]
        let ventNode = SCNNode(geometry: ventGeom)
        ventNode.position = SCNVector3(0, Float(0.02 + ridgeVentH/2), 0)
        ventNode.eulerAngles.x = 0
        ventNode.name = "RidgeVent"
        vent.addChildNode(ventNode)
        vent.addChildNode(makeBillboardLabel("VentilationLayer", color: .systemBlue, y: 0.42))

        // Stack model parts into root
        [framing, decking, under, flashing, cover, vent].forEach { root.addChildNode($0) }

        // Center the whole assembly visually
        root.position = SCNVector3(0, -0.05, 0)
        return root
    }

    // Billboard text label that faces camera, attached as a child named "Label"
    private func makeBillboardLabel(_ text: String, color: UIColor, y: CGFloat) -> SCNNode {
        let labelNode = SCNNode()
        labelNode.name = "Label"
        let geo = SCNText(string: text, extrusionDepth: 0.001)
        geo.font = UIFont.systemFont(ofSize: 0.12, weight: .bold)
        geo.flatness = 0.2
        geo.firstMaterial = {
            let m = SCNMaterial()
            m.diffuse.contents = color
            m.emission.contents = color
            return m
        }()
        let textNode = SCNNode(geometry: geo)
        textNode.scale = SCNVector3(0.01, 0.01, 0.01)
        // center pivot
        let (minv, maxv) = geo.boundingBox
        let center = SCNVector3((minv.x + maxv.x)/2, minv.y, (minv.z + maxv.z)/2)
        textNode.pivot = SCNMatrix4MakeTranslation(center.x, center.y, center.z)
        textNode.position = SCNVector3(0, Float(y), 0)

        // billboard constraint to face camera
        let billboard = SCNBillboardConstraint()
        billboard.freeAxes = .Y
        textNode.constraints = [billboard]

        // subtle background plate for readability
        let plate = SCNPlane(width: CGFloat(maxv.x - minv.x) * 0.012, height: 0.06)
        let bg = SCNMaterial()
        bg.diffuse.contents = UIColor.black.withAlphaComponent(0.35)
        plate.cornerRadius = 0.01
        plate.materials = [bg]
        let plateNode = SCNNode(geometry: plate)
        plateNode.position = SCNVector3(0, Float(y) + 0.001, -0.02)
        plateNode.eulerAngles.x = -Float.pi / 2

        labelNode.addChildNode(plateNode)
        labelNode.addChildNode(textNode)
        return labelNode
    }

    // Coordinator
    final class Coordinator: NSObject {
        weak var view: SCNView?
        let onPick: (String, SCNNode) -> Void
        init(onPick: @escaping (String, SCNNode) -> Void) { self.onPick = onPick }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let v = view else { return }
            let p = gesture.location(in: v)
            let hits = v.hitTest(p, options: [SCNHitTestOption.searchMode: SCNHitTestSearchMode.all.rawValue])
            guard let node = hits.first?.node else { return }
            let name: String = {
                if let n = node.name, !n.isEmpty { return n }
                if let p = node.parent?.name, !p.isEmpty { return p }
                return "Part"
            }()
            // find top-level layer name for cleaner display
            let layerName = topLayerName(from: node) ?? name
            onPick(layerName, node)
        }

        private func topLayerName(from node: SCNNode) -> String? {
            var cur: SCNNode? = node
            while let c = cur {
                if let n = c.name, n.hasSuffix("Layer") { return n }
                cur = c.parent
            }
            return nil
        }
    }
}

// MARK: - Preview (optional)
#if DEBUG
struct Roof3DView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack { Roof3DView() }
    }
}
#endif
