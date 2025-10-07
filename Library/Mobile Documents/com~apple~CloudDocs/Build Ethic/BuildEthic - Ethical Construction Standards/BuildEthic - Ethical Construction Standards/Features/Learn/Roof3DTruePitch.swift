//
// Roof3DTruePitch.swift
// Copy–paste once. Replaces the previous procedural model with a more
// accurate, layered gable roof showing true pitch (e.g., 6:12 = 26.565°),
// correct layer order, starter & shingle courses, ridge caps, ice barrier,
// drip-edge logic (eave under / rake over), and an exploded-view slider.
//
// Usage:
//   NavigationStack { Roof3DTruePitchView(pitchRisePer12: 6) }   // 4…12 supported
//

import SwiftUI
import SceneKit

public struct Roof3DTruePitchView: View {
    public let pitchRisePer12: CGFloat
    @State private var showFraming = true
    @State private var showDecking = true
    @State private var showIceBarrier = true
    @State private var showUnderlayment = true
    @State private var showFlashing = true
    @State private var showCovering = true
    @State private var showRidgeCap = true
    @State private var showVentilation = true
    @State private var exploded: CGFloat = 0.0
    @State private var pickedLabel: String?

    public init(pitchRisePer12: CGFloat = 6) {
        self.pitchRisePer12 = max(1, min(18, pitchRisePer12))
    }

    public var body: some View {
        VStack(spacing: 6) {
            RoofSceneAccurate(
                pitchRisePer12: pitchRisePer12,
                showFraming: showFraming,
                showDecking: showDecking,
                showIceBarrier: showIceBarrier,
                showUnderlayment: showUnderlayment,
                showFlashing: showFlashing,
                showCovering: showCovering,
                showRidgeCap: showRidgeCap,
                showVentilation: showVentilation,
                exploded: exploded,
                onPick: { pickedLabel = $0 }
            )
            .overlay(alignment: .topLeading) {
                VStack(alignment: .leading, spacing: 6) {
                    if let label = pickedLabel {
                        Text(label)
                            .font(.caption.weight(.bold))
                            .padding(8)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    }
                    Text("Pitch: \(Int(pitchRisePer12)):12  (\(formatAngle(rad: atan(pitchRisePer12/12)))°)")
                        .font(.caption2.monospaced())
                        .padding(6)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                }
                .padding(10)
            }
            controls
        }
        .navigationTitle("3D Roof (True Pitch)")
    }

    private var controls: some View {
        VStack(spacing: 8) {
            HStack {
                Toggle("Framing", isOn: $showFraming)
                Toggle("Deck", isOn: $showDecking)
                Toggle("Ice", isOn: $showIceBarrier)
                Toggle("Underl.", isOn: $showUnderlayment)
            }
            .toggleStyle(.switch)
            .font(.footnote.weight(.semibold))

            HStack {
                Toggle("Flashing", isOn: $showFlashing)
                Toggle("Covering", isOn: $showCovering)
                Toggle("Ridge Cap", isOn: $showRidgeCap)
                Toggle("Vent", isOn: $showVentilation)
            }
            .toggleStyle(.switch)
            .font(.footnote.weight(.semibold))

            HStack {
                Text("Exploded")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Slider(value: $exploded, in: 0...1)
            }
            .padding(.horizontal)
        }
        .padding(.bottom, 8)
    }
}

// MARK: - SceneKit Accurate Roof
fileprivate struct RoofSceneAccurate: UIViewRepresentable {
    // Inputs
    let pitchRisePer12: CGFloat
    let showFraming: Bool
    let showDecking: Bool
    let showIceBarrier: Bool
    let showUnderlayment: Bool
    let showFlashing: Bool
    let showCovering: Bool
    let showRidgeCap: Bool
    let showVentilation: Bool
    let exploded: CGFloat
    let onPick: (String) -> Void

    func makeCoordinator() -> Coord { Coord(onPick: onPick) }

    func makeUIView(context: Context) -> SCNView {
        let v = SCNView()
        v.backgroundColor = UIColor.systemBackground
        v.autoenablesDefaultLighting = false
        v.allowsCameraControl = true
        v.antialiasingMode = .multisampling4X

        let scene = SCNScene()
        v.scene = scene

        // Camera
        let cam = SCNNode()
        cam.camera = SCNCamera()
        cam.camera?.fieldOfView = 42
        cam.position = SCNVector3(0, 0.9, 2.8)
        scene.rootNode.addChildNode(cam)

        // Lighting
        let key = SCNNode()
        key.light = SCNLight()
        key.light?.type = .directional
        key.light?.intensity = 900
        key.eulerAngles = SCNVector3(-Float.pi/3, Float.pi/4, 0)
        scene.rootNode.addChildNode(key)

        let fill = SCNNode()
        fill.light = SCNLight()
        fill.light?.type = .ambient
        fill.light?.intensity = 350
        fill.light?.color = UIColor(white: 0.8, alpha: 1)
        scene.rootNode.addChildNode(fill)

        // Build model
        let roof = AccurateRoofBuilder.build(pitchRisePer12: pitchRisePer12)
        scene.rootNode.addChildNode(roof)

        // Idle rotate for clarity
        let spin = SCNAction.repeatForever(.rotateBy(x: 0, y: CGFloat.pi/10, z: 0, duration: 8))
        roof.runAction(spin)

        // Tap
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coord.tap(_:)))
        v.addGestureRecognizer(tap)
        context.coordinator.view = v

        applyVisibility(v)
        return v
    }

    func updateUIView(_ v: SCNView, context: Context) {
        applyVisibility(v)
    }

    private func applyVisibility(_ v: SCNView) {
        guard let root = v.scene?.rootNode.childNode(withName: "RoofSystemTrue", recursively: true) else { return }
        set(root, "FramingLayer", showFraming)
        set(root, "DeckingLayer", showDecking)
        set(root, "IceBarrierLayer", showIceBarrier)
        set(root, "UnderlaymentLayer", showUnderlayment)
        set(root, "FlashingLayer", showFlashing)
        set(root, "CoveringLayer", showCovering)
        set(root, "RidgeCapLayer", showRidgeCap)
        set(root, "VentilationLayer", showVentilation)

        // Exploded view offsets
        AccurateRoofBuilder.applyExplodedOffsets(root: root, t: exploded)
    }

    private func set(_ root: SCNNode, _ name: String, _ visible: Bool) {
        root.childNode(withName: name, recursively: true)?.isHidden = !visible
    }

    final class Coord: NSObject {
        weak var view: SCNView?
        let onPick: (String) -> Void
        init(onPick: @escaping (String) -> Void) { self.onPick = onPick }
        @objc func tap(_ g: UITapGestureRecognizer) {
            guard let v = view else { return }
            let hits = v.hitTest(g.location(in: v), options: [
                SCNHitTestOption.searchMode: SCNHitTestSearchMode.all.rawValue
            ])
            guard let n = hits.first?.node else { return }
            let name = Self.topLayer(from: n) ?? (n.name ?? "Part")
            onPick(name)
            // brief highlight
            n.removeAllActions()
            let flash = SCNAction.customAction(duration: 0.7) { node, t in
                let p = sin((t/0.7) * CGFloat.pi)
                node.geometry?.firstMaterial?.emission.contents = UIColor.systemYellow.withAlphaComponent(0.5*CGFloat(p))
            }
            n.runAction(.repeat(flash, count: 2))
        }
        static func topLayer(from node: SCNNode) -> String? {
            var cur: SCNNode? = node
            while let c = cur {
                if let n = c.name, n.hasSuffix("Layer") { return n }
                cur = c.parent
            }
            return nil
        }
    }
}

// MARK: - Accurate Roof Builder
fileprivate enum AccurateRoofBuilder {
    // Dimensions (meters). Kept compact for mobile performance.
    // Span = 2 * run; depth is front-to-back. Overhang applied at eaves & rakes.
    static let runPerSide: CGFloat = 1.25         // horizontal run each side (~49")
    static let depth: CGFloat = 1.20              // roof depth (~47")
    static let eaveOverhang: CGFloat = 0.06       // 2.4"
    static let rakeOverhang: CGFloat = 0.04       // 1.6"
    static let deckThk: CGFloat = 0.012           // 1/2" nominal
    static let iceWidthSlope: CGFloat = 0.90      // ~36" along slope
    static let underThk: CGFloat = 0.004
    static let shingleThk: CGFloat = 0.006
    static let starterThk: CGFloat = 0.0045
    static let courseExposure: CGFloat = 0.127    // 5" exposure
    static let ridgeCapWidth: CGFloat = 0.16
    static let ridgeCapOverlap: CGFloat = 0.04

    // Materials
    static func matWood() -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = UIColor(red: 0.84, green: 0.70, blue: 0.50, alpha: 1)
        m.roughness.contents = 0.8
        return m
    }
    static func matPlywood() -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = UIColor(red: 0.89, green: 0.78, blue: 0.58, alpha: 1)
        return m
    }
    static func matIce() -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = UIColor(red: 0.10, green: 0.12, blue: 0.16, alpha: 1)
        m.emission.contents = UIColor(red: 0.05, green: 0.06, blue: 0.08, alpha: 1)
        return m
    }
    static func matUnder() -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = UIColor(white: 0.15, alpha: 1)
        return m
    }
    static func matMetal() -> SCNMaterial {
        let m = SCNMaterial()
        m.metalness.contents = 0.8
        m.roughness.contents = 0.25
        m.diffuse.contents = UIColor(white: 0.85, alpha: 1)
        return m
    }
    static func matShingle() -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = UIColor(red: 0.18, green: 0.20, blue: 0.22, alpha: 1)
        m.roughness.contents = 0.7
        return m
    }
    static func matLabel(_ c: UIColor) -> SCNMaterial {
        let m = SCNMaterial()
        m.diffuse.contents = c
        m.emission.contents = c
        return m
    }

    static func build(pitchRisePer12: CGFloat) -> SCNNode {
        let root = SCNNode()
        root.name = "RoofSystemTrue"

        // Slope geometry
        let slopeAngle = atan(pitchRisePer12/12)             // radians
        let rise = runPerSide * tan(slopeAngle)              // vertical rise to ridge
        let slopeLen = hypot(runPerSide + rakeOverhang, rise)

        // MARK: Framing (rafters @ 24" oc) + ridge + joists
        let framing = SCNNode(); framing.name = "FramingLayer"
        let wood = matWood()

        // Joists (showing base for composition context)
        let joistCt = 6
        for i in 0..<joistCt {
            let x = (-runPerSide) + CGFloat(i) * (2*runPerSide)/CGFloat(joistCt-1)
            let g = SCNBox(width: 0.04, height: 0.03, length: depth, chamferRadius: 0)
            g.materials = [wood]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(x, -0.12, 0)
            n.name = "Framing_Joist_\(i)"
            framing.addChildNode(n)
        }

        // Rafters along slope
        let rafterSpacing: CGFloat = 0.61 // ~24"
        let rafterCt = max(2, Int(depth / rafterSpacing) + 1)
        for i in 0..<rafterCt {
            let z = (-depth/2) + CGFloat(i) * (depth / CGFloat(rafterCt-1))
            let rGeom = SCNBox(width: 0.04, height: 0.03, length: slopeLen, chamferRadius: 0)
            rGeom.materials = [wood]

            // Left
            let left = SCNNode(geometry: rGeom)
            left.pivot = SCNMatrix4MakeTranslation(0, 0, Float(-slopeLen/2))
            left.eulerAngles.z = Float(slopeAngle)            // tilt up to ridge
            left.position = SCNVector3(-runPerSide, 0, z)
            left.name = "Framing_RafterL_\(i)"
            framing.addChildNode(left)

            // Right
            let right = left.clone()
            right.eulerAngles.z = Float(-slopeAngle)
            right.position = SCNVector3(runPerSide, 0, z)
            right.name = "Framing_RafterR_\(i)"
            framing.addChildNode(right)
        }

        // Ridge board
        let ridge = SCNBox(width: 0.04, height: 0.08, length: depth + 2*rakeOverhang, chamferRadius: 0)
        ridge.materials = [wood]
        let ridgeNode = SCNNode(geometry: ridge)
        ridgeNode.position = SCNVector3(0, rise, 0)
        ridgeNode.name = "Framing_Ridge"
        framing.addChildNode(ridgeNode)
        framing.addChildNode(billboard("FramingLayer", y: rise + 0.10, color: .systemOrange))
        root.addChildNode(framing)

        // MARK: Decking (two sloped planes)
        let deck = SCNNode(); deck.name = "DeckingLayer"
        let ply = matPlywood()

        func makeDeck(side: CGFloat) -> SCNNode {
            // thin box aligned along slope; width == depth + overhangs, thickness == deckThk
            let g = SCNBox(width: deckThk,
                           height: depth + 2*eaveOverhang,
                           length: slopeLen,
                           chamferRadius: 0)
            g.materials = [ply]
            let n = SCNNode(geometry: g)
            n.pivot = SCNMatrix4MakeTranslation(Float(deckThk/2), 0, Float(-slopeLen/2))
            n.eulerAngles.z = Float(side < 0 ? slopeAngle : -slopeAngle)
            n.position = SCNVector3(side * runPerSide, 0, 0)
            n.name = side < 0 ? "Deck_Left" : "Deck_Right"
            return n
        }
        deck.addChildNode(makeDeck(side: -1))
        deck.addChildNode(makeDeck(side: 1))
        deck.addChildNode(billboard("DeckingLayer", y: rise + 0.16, color: .systemBrown))
        root.addChildNode(deck)

        // MARK: Ice Barrier (self-adhered at eaves, along slope length ~36")
        let ice = SCNNode(); ice.name = "IceBarrierLayer"
        let iceMat = matIce()
        func makeIce(side: CGFloat) -> SCNNode {
            let len = iceWidthSlope
            let g = SCNBox(width: underThk,
                           height: depth + 2*eaveOverhang,
                           length: len,
                           chamferRadius: 0)
            g.materials = [iceMat]
            let n = SCNNode(geometry: g)
            n.pivot = SCNMatrix4MakeTranslation(Float(underThk/2), 0, Float(-len/2))
            n.eulerAngles.z = Float(side < 0 ? slopeAngle : -slopeAngle)
            // position starting at eave (0) moving upslope
            n.position = SCNVector3(side * runPerSide, 0.01, 0)
            n.name = side < 0 ? "Ice_Left" : "Ice_Right"
            return n
        }
        ice.addChildNode(makeIce(side: -1))
        ice.addChildNode(makeIce(side: 1))
        ice.addChildNode(billboard("IceBarrier", y: rise + 0.22, color: .systemIndigo))
        root.addChildNode(ice)

        // MARK: Underlayment (full slope)
        let under = SCNNode(); under.name = "UnderlaymentLayer"
        let underMat = matUnder()
        func makeUnder(side: CGFloat) -> SCNNode {
            let g = SCNBox(width: underThk,
                           height: depth + 2*eaveOverhang,
                           length: slopeLen,
                           chamferRadius: 0)
            g.materials = [underMat]
            let n = SCNNode(geometry: g)
            n.pivot = SCNMatrix4MakeTranslation(Float(underThk/2), 0, Float(-slopeLen/2))
            n.eulerAngles.z = Float(side < 0 ? slopeAngle : -slopeAngle)
            n.position = SCNVector3(side * runPerSide, 0.012, 0)
            n.name = side < 0 ? "Under_Left" : "Under_Right"
            return n
        }
        under.addChildNode(makeUnder(side: -1))
        under.addChildNode(makeUnder(side: 1))
        under.addChildNode(billboard("UnderlaymentLayer", y: rise + 0.28, color: .darkGray))
        root.addChildNode(under)

        // MARK: Drip Edge (Flashing): eave UNDER underlayment; rake OVER underlayment
        let flashing = SCNNode(); flashing.name = "FlashingLayer"
        let metal = matMetal()
        // Eaves (front/back) simple strips under underlayment
        let eaveStripLen = slopeLen
        func eaveStrip(z: CGFloat) -> SCNNode {
            let g = SCNBox(width: 0.004, height: eaveStripLen, length: 0.02, chamferRadius: 0)
            g.materials = [metal]
            let n = SCNNode(geometry: g)
            n.eulerAngles.x = Float.pi/2
            n.position = SCNVector3(0, -0.002, z)
            n.name = "DripEdge_Eave"
            return n
        }
        flashing.addChildNode(eaveStrip(z: -depth/2 - eaveOverhang/2))
        flashing.addChildNode(eaveStrip(z: depth/2 + eaveOverhang/2))
        // Rakes (sides) over underlayment
        func rakeStrip(side: CGFloat) -> SCNNode {
            let g = SCNBox(width: 0.004, height: depth + 2*eaveOverhang, length: 0.02, chamferRadius: 0)
            g.materials = [metal]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(side * (runPerSide + rakeOverhang), 0.025, 0)
            n.name = side < 0 ? "DripEdge_RakeL" : "DripEdge_RakeR"
            return n
        }
        flashing.addChildNode(rakeStrip(side: -1))
        flashing.addChildNode(rakeStrip(side: 1))
        flashing.addChildNode(billboard("FlashingLayer", y: rise + 0.34, color: .systemTeal))
        root.addChildNode(flashing)

        // MARK: Covering (Shingles): starter + courses with exposure; staggered joints
        let cover = SCNNode(); cover.name = "CoveringLayer"
        let shMat = matShingle()

        func starter(side: CGFloat) -> SCNNode {
            let g = SCNBox(width: starterThk, height: depth + 2*eaveOverhang, length: courseExposure, chamferRadius: 0)
            g.materials = [shMat]
            let n = SCNNode(geometry: g)
            n.pivot = SCNMatrix4MakeTranslation(Float(starterThk/2), 0, Float(-courseExposure/2))
            n.eulerAngles.z = Float(side < 0 ? slopeAngle : -slopeAngle)
            n.position = SCNVector3(side * runPerSide, 0.018, 0)
            n.name = side < 0 ? "Starter_Left" : "Starter_Right"
            return n
        }
        cover.addChildNode(starter(side: -1))
        cover.addChildNode(starter(side: 1))

        func courses(side: CGFloat) -> SCNNode {
            let group = SCNNode(); group.name = side < 0 ? "Courses_Left" : "Courses_Right"
            let usableLen = slopeLen - courseExposure // after starter
            let count = max(1, Int(usableLen / courseExposure))
            for i in 0..<count {
                let len: CGFloat = courseExposure
                let g = SCNBox(width: shingleThk, height: depth + 2*eaveOverhang, length: len, chamferRadius: 0)
                // alternating subtle tint for stagger read
                let m = shMat.copy() as! SCNMaterial
                if i % 2 == 1 { m.diffuse.contents = UIColor(red: 0.20, green: 0.22, blue: 0.24, alpha: 1) }
                g.materials = [m]
                let n = SCNNode(geometry: g)
                n.pivot = SCNMatrix4MakeTranslation(Float(shingleThk/2), 0, Float(-len/2))
                n.eulerAngles.z = Float(side < 0 ? slopeAngle : -slopeAngle)
                let offset = courseExposure + CGFloat(i) * courseExposure
                n.position = SCNVector3(side * runPerSide, 0.02, 0)
                // Slide each course upslope along the rotated local z:
                n.localTranslate(by: SCNVector3(0, 0, Float(offset)))
                n.name = "Course_\(i+1)"
                group.addChildNode(n)
            }
            return group
        }
        cover.addChildNode(courses(side: -1))
        cover.addChildNode(courses(side: 1))
        cover.addChildNode(billboard("CoveringLayer", y: rise + 0.40, color: .black))
        root.addChildNode(cover)

        // MARK: Ridge Cap (shingle caps along ridge)
        let ridgeCap = SCNNode(); ridgeCap.name = "RidgeCapLayer"
        let capLen = depth + 2*eaveOverhang
        let capStep = ridgeCapWidth - ridgeCapOverlap
        let capCount = max(1, Int(capLen / capStep))
        for i in 0..<capCount {
            let g = SCNBox(width: ridgeCapWidth, height: shingleThk, length: ridgeCapWidth, chamferRadius: 0.01)
            g.materials = [shMat]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(0, rise + 0.021, (-capLen/2) + CGFloat(i) * capStep)
            n.eulerAngles.x = Float.pi/2
            n.name = "RidgeCap_\(i+1)"
            ridgeCap.addChildNode(n)
        }
        ridgeCap.addChildNode(billboard("RidgeCapLayer", y: rise + 0.46, color: .black))
        root.addChildNode(ridgeCap)

        // MARK: Ventilation (ridge vent)
        let ventLayer = SCNNode(); ventLayer.name = "VentilationLayer"
        let vent = SCNBox(width: 0.10, height: 0.025, length: depth * 0.85, chamferRadius: 0.004)
        let ventMat = SCNMaterial()
        ventMat.diffuse.contents = UIColor(white: 0.12, alpha: 1)
        vent.materials = [ventMat]
        let ventNode = SCNNode(geometry: vent)
        ventNode.position = SCNVector3(0, rise + 0.018, 0)
        ventNode.name = "RidgeVent"
        ventLayer.addChildNode(ventNode)
        ventLayer.addChildNode(billboard("VentilationLayer", y: rise + 0.52, color: .systemBlue))
        root.addChildNode(ventLayer)

        // Position whole assembly slightly down
        root.position = SCNVector3(0, -0.05, 0)
        return root
    }

    // Exploded offsets by layer for clarity
    static func applyExplodedOffsets(root: SCNNode, t: CGFloat) {
        func off(_ y: Float) -> SCNVector3 { SCNVector3(0, y, 0) }
        root.childNode(withName: "FramingLayer", recursively: true)?.position = off(0)
        root.childNode(withName: "DeckingLayer", recursively: true)?.position = off(Float(0.04 * t))
        root.childNode(withName: "IceBarrierLayer", recursively: true)?.position = off(Float(0.08 * t))
        root.childNode(withName: "UnderlaymentLayer", recursively: true)?.position = off(Float(0.12 * t))
        root.childNode(withName: "FlashingLayer", recursively: true)?.position = off(Float(0.16 * t))
        root.childNode(withName: "CoveringLayer", recursively: true)?.position = off(Float(0.22 * t))
        root.childNode(withName: "RidgeCapLayer", recursively: true)?.position = off(Float(0.26 * t))
        root.childNode(withName: "VentilationLayer", recursively: true)?.position = off(Float(0.30 * t))
    }

    // Billboard text tag
    static func billboard(_ text: String, y: CGFloat, color: UIColor) -> SCNNode {
        let container = SCNNode(); container.name = "Label"
        let bgW: CGFloat = 0.28, bgH: CGFloat = 0.06

        let plane = SCNPlane(width: bgW, height: bgH)
        let bg = SCNMaterial()
        bg.diffuse.contents = UIColor.black.withAlphaComponent(0.35)
        plane.cornerRadius = 0.012
        plane.materials = [bg]
        let pNode = SCNNode(geometry: plane)
        pNode.eulerAngles.x = 0
        pNode.position = SCNVector3(0, Float(y), 0)

        let tGeo = SCNText(string: text, extrusionDepth: 0.001)
        tGeo.font = UIFont.systemFont(ofSize: 0.12, weight: .bold)
        tGeo.flatness = 0.2
        tGeo.materials = [matLabel(color)]
        let tNode = SCNNode(geometry: tGeo)
        tNode.scale = SCNVector3(0.01, 0.01, 0.01)
        let (minB, maxB) = tGeo.boundingBox
        tNode.pivot = SCNMatrix4MakeTranslation((minB.x+maxB.x)/2, minB.y, (minB.z+maxB.z)/2)
        tNode.position = SCNVector3(0, Float(y), 0.001)

        let bb = SCNBillboardConstraint()
        bb.freeAxes = .Y
        pNode.constraints = [bb]; tNode.constraints = [bb]

        container.addChildNode(pNode)
        container.addChildNode(tNode)
        return container
    }
}

// MARK: - Helpers
fileprivate func formatAngle(rad: CGFloat) -> String {
    let deg = rad * 180 / CGFloat.pi
    return String(format: "%.2f", deg)
}

// MARK: - Preview
#if DEBUG
struct Roof3DTruePitchView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack { Roof3DTruePitchView(pitchRisePer12: 6) }
            .preferredColorScheme(.light)
    }
}
#endif
