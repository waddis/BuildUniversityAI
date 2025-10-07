//
// Roof3DGableV3.swift
// Copy–paste once. Accurate gable composition with true pitch, proper overhangs,
// fascia, eave/rake drip edges, ice barrier, full underlayment, shingles/courses,
// and ridge caps. Layer toggles + exploded slider for teaching.
//
// Usage:
//   NavigationStack { Roof3DGableV3View(pitchRisePer12: 6) }  // 4…12 typical
//

import SwiftUI
import SceneKit

public struct Roof3DGableV3View: View {
    public let pitchRisePer12: CGFloat
    @State private var showFraming = true
    @State private var showDecking = true
    @State private var showIceBarrier = true
    @State private var showUnderlayment = true
    @State private var showFlashing = true
    @State private var showCovering = true
    @State private var showRidgeCap = true
    @State private var showVentilation = true
    @State private var exploded: CGFloat = 0
    @State private var picked: String?

    public init(pitchRisePer12: CGFloat = 6) {
        self.pitchRisePer12 = max(1, min(18, pitchRisePer12))
    }

    public var body: some View {
        VStack(spacing: 8) {
            SceneHost(
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
                onPick: { picked = $0 }
            )
            .overlay(alignment: .topLeading) {
                VStack(alignment: .leading, spacing: 6) {
                    if let p = picked {
                        Text(p).font(.caption.bold())
                            .padding(8)
                            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 10))
                    }
                    Text("Pitch \(Int(pitchRisePer12)):12  •  \(angleDeg(pitchRisePer12))°")
                        .font(.caption2.monospaced())
                        .padding(6)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 8))
                }
                .padding(10)
            }

            // Controls
            VStack(spacing: 8) {
                HStack {
                    Toggle("Framing", isOn: $showFraming)
                    Toggle("Deck", isOn: $showDecking)
                    Toggle("Ice", isOn: $showIceBarrier)
                    Toggle("Underl.", isOn: $showUnderlayment)
                }.font(.footnote.weight(.semibold))

                HStack {
                    Toggle("Flashing", isOn: $showFlashing)
                    Toggle("Covering", isOn: $showCovering)
                    Toggle("Ridge Cap", isOn: $showRidgeCap)
                    Toggle("Vent", isOn: $showVentilation)
                }.font(.footnote.weight(.semibold))

                HStack {
                    Text("Exploded").font(.footnote).foregroundStyle(.secondary)
                    Slider(value: $exploded, in: 0...1)
                }.padding(.horizontal)
            }.padding(.bottom, 8)
        }
        .navigationTitle("3D Roof (Gable)")
    }

    private func angleDeg(_ r: CGFloat) -> String {
        let a = atan(r/12) * 180 / CGFloat.pi
        return String(format: "%.1f", a)
    }
}

// MARK: - SceneKit Host
fileprivate struct SceneHost: UIViewRepresentable {
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
        v.allowsCameraControl = true
        v.antialiasingMode = .multisampling4X
        v.autoenablesDefaultLighting = false

        let scene = SCNScene()
        v.scene = scene

        // Camera + lights
        let cam = SCNNode()
        cam.camera = SCNCamera()
        cam.camera?.fieldOfView = 42
        cam.position = SCNVector3(0, 0.9, 2.8)
        scene.rootNode.addChildNode(cam)

        let key = SCNNode()
        key.light = SCNLight(); key.light?.type = .directional; key.light?.intensity = 900
        key.eulerAngles = SCNVector3(-Float.pi/3, Float.pi/4, 0)
        scene.rootNode.addChildNode(key)

        let amb = SCNNode()
        amb.light = SCNLight(); amb.light?.type = .ambient; amb.light?.intensity = 400
        amb.light?.color = UIColor(white: 0.85, alpha: 1)
        scene.rootNode.addChildNode(amb)

        // Build accurate gable
        let roof = GableBuilder.build(pitchRisePer12: pitchRisePer12)
        scene.rootNode.addChildNode(roof)

        // Gentle spin (can remove)
        roof.runAction(.repeatForever(.rotateBy(x: 0, y: CGFloat.pi/10, z: 0, duration: 8)))

        // Tap
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coord.tap(_:)))
        v.addGestureRecognizer(tap)
        context.coordinator.view = v

        apply(v)
        return v
    }

    func updateUIView(_ v: SCNView, context: Context) { apply(v) }

    private func apply(_ v: SCNView) {
        guard let root = v.scene?.rootNode.childNode(withName: "RoofSystemGable", recursively: true) else { return }
        set(root, "FramingLayer", showFraming)
        set(root, "DeckingLayer", showDecking)
        set(root, "IceBarrierLayer", showIceBarrier)
        set(root, "UnderlaymentLayer", showUnderlayment)
        set(root, "FlashingLayer", showFlashing)
        set(root, "CoveringLayer", showCovering)
        set(root, "RidgeCapLayer", showRidgeCap)
        set(root, "VentilationLayer", showVentilation)
        GableBuilder.applyExploded(root: root, t: exploded)
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
            let hits = v.hitTest(g.location(in: v), options: [SCNHitTestOption.searchMode: SCNHitTestSearchMode.all.rawValue])
            guard let node = hits.first?.node else { return }
            onPick(self.layerName(from: node) ?? node.name ?? "Part")
            node.removeAllActions()
            let flash = SCNAction.customAction(duration: 0.7) { n, t in
                let p = sin((t/0.7)*CGFloat.pi)
                n.geometry?.firstMaterial?.emission.contents = UIColor.systemYellow.withAlphaComponent(0.5*CGFloat(p))
            }
            node.runAction(.repeat(flash, count: 2))
        }
        private func layerName(from n: SCNNode) -> String? {
            var cur: SCNNode? = n
            while let c = cur {
                if let nm = c.name, nm.hasSuffix("Layer") { return nm }
                cur = c.parent
            }
            return nil
        }
    }
}

// MARK: - Parametric Gable Builder (corrected geometry + pivots)
fileprivate enum GableBuilder {
    // Base dims (meters)
    static let runPerSide: CGFloat = 1.25      // horizontal run each side
    static let depth: CGFloat = 1.20           // front–back
    static let eaveOverhang: CGFloat = 0.08
    static let rakeOverhang: CGFloat = 0.05
    static let deckThk: CGFloat = 0.012
    static let iceSlopeLen: CGFloat = 0.90     // ~36"
    static let underThk: CGFloat = 0.004
    static let shingleThk: CGFloat = 0.006
    static let starterThk: CGFloat = 0.0045
    static let courseExposure: CGFloat = 0.127 // 5"
    static let fasciaThk: CGFloat = 0.018
    static let fasciaDepth: CGFloat = 0.14

    // Materials
    static func wood() -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents = UIColor(red:0.84,green:0.70,blue:0.50,alpha:1); m.roughness.contents=0.8; return m }
    static func plywood() -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents = UIColor(red:0.90,green:0.79,blue:0.58,alpha:1); return m }
    static func iceMat() -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents = UIColor(white:0.12, alpha:1); m.emission.contents = UIColor(white:0.06, alpha:1); return m }
    static func underMat() -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents = UIColor(white:0.17, alpha:1); return m }
    static func metal() -> SCNMaterial { let m = SCNMaterial(); m.metalness.contents=0.8; m.roughness.contents=0.25; m.diffuse.contents = UIColor(white:0.86, alpha:1); return m }
    static func shingle() -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents = UIColor(red:0.18,green:0.20,blue:0.22,alpha:1); m.roughness.contents=0.7; return m }
    static func label(_ c: UIColor) -> SCNMaterial { let m = SCNMaterial(); m.diffuse.contents=c; m.emission.contents=c; return m }

    static func build(pitchRisePer12: CGFloat) -> SCNNode {
        let root = SCNNode(); root.name = "RoofSystemGable"
        let slopeA = atan(pitchRisePer12/12)
        let runWithRake = runPerSide + rakeOverhang
        let rise = runWithRake * tan(slopeA)
        let slopeLen = hypot(runWithRake, rise)
        let depthWithEave = depth + 2*eaveOverhang

        // Helper: a "slope slab" oriented and pivoted at eave, running to ridge
        func slopeSlab(width slope: CGFloat, height thk: CGFloat, length d: CGFloat, side: CGFloat, material: SCNMaterial) -> SCNNode {
            // SCNBox: width=X (slope), height=Y (thickness), length=Z (depth)
            let g = SCNBox(width: slope, height: thk, length: d, chamferRadius: 0)
            g.materials = [material]
            let n = SCNNode(geometry: g)
            // Pivot at eave (minX face) so rotation lifts ridge correctly
            n.pivot = SCNMatrix4MakeTranslation(Float(-slope/2), 0, 0)
            n.eulerAngles.z = Float(side < 0 ? slopeA : -slopeA)
            // Eave X coordinate at left/right overhang start
            let eaveX = side * (-runWithRake)
            n.position = SCNVector3(eaveX, 0, 0)
            n.name = side < 0 ? "Slab_Left" : "Slab_Right"
            return n
        }

        // ===== Framing =====
        let framing = SCNNode(); framing.name = "FramingLayer"
        let woodM = wood()

        // Joists
        let joistCt = 6
        for i in 0..<joistCt {
            let x = (-runPerSide) + CGFloat(i) * (2*runPerSide)/CGFloat(joistCt-1)
            let g = SCNBox(width: 0.04, height: 0.03, length: depth, chamferRadius: 0)
            g.materials = [woodM]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(x, -0.12, 0)
            n.name = "Framing_Joist_\(i)"
            framing.addChildNode(n)
        }
        // Rafters (pivot at seat cut near eave)
        let rafterSpacing: CGFloat = 0.61
        let rafterCt = max(2, Int(depth / rafterSpacing) + 1)
        for i in 0..<rafterCt {
            let z = (-depth/2) + CGFloat(i) * (depth / CGFloat(rafterCt-1))
            let len = slopeLen
            let g = SCNBox(width: len, height: 0.04, length: 0.035, chamferRadius: 0) // width along slope
            g.materials = [woodM]
            // Left
            let l = SCNNode(geometry: g)
            l.pivot = SCNMatrix4MakeTranslation(Float(-len/2), 0, 0)
            l.eulerAngles.z = Float(slopeA)
            l.position = SCNVector3(-runWithRake, 0, z)
            l.name = "Framing_RafterL_\(i)"
            framing.addChildNode(l)
            // Right
            let r = l.clone()
            r.eulerAngles.z = Float(-slopeA)
            r.position = SCNVector3(runWithRake, 0, z)
            r.name = "Framing_RafterR_\(i)"
            framing.addChildNode(r)
        }
        // Ridge board
        let ridge = SCNBox(width: 0.04, height: 0.10, length: depthWithEave, chamferRadius: 0)
        ridge.materials = [woodM]
        let ridgeNode = SCNNode(geometry: ridge)
        ridgeNode.position = SCNVector3(0, rise, 0); ridgeNode.name = "Framing_Ridge"
        framing.addChildNode(ridgeNode)

        framing.addChildNode(tag("FramingLayer", y: rise + 0.10, color: .systemOrange))
        root.addChildNode(framing)

        // ===== Decking =====
        let decking = SCNNode(); decking.name = "DeckingLayer"
        let deckM = plywood()
        decking.addChildNode(slopeSlab(width: slopeLen, height: deckThk, length: depthWithEave, side: -1, material: deckM))
        decking.addChildNode(slopeSlab(width: slopeLen, height: deckThk, length: depthWithEave, side:  1, material: deckM))
        // Fascia (eave) boards for silhouette
        let fasciaM = woodM
        func fasciaEave(z: CGFloat) -> SCNNode {
            let g = SCNBox(width: 2*runPerSide + 2*rakeOverhang, height: fasciaDepth, length: fasciaThk, chamferRadius: 0)
            g.materials = [fasciaM]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(0, -fasciaDepth/2, z)
            return n
        }
        decking.addChildNode(fasciaEave(z: -depth/2 - eaveOverhang))
        decking.addChildNode(fasciaEave(z:  depth/2 + eaveOverhang))
        decking.addChildNode(tag("DeckingLayer", y: rise + 0.16, color: .systemBrown))
        root.addChildNode(decking)

        // ===== Ice Barrier (36\" upslope from eave) =====
        let ice = SCNNode(); ice.name = "IceBarrierLayer"
        let iceM = iceMat()
        ice.addChildNode(slopeSlab(width: iceSlopeLen, height: underThk, length: depthWithEave, side: -1, material: iceM))
        ice.addChildNode(slopeSlab(width: iceSlopeLen, height: underThk, length: depthWithEave, side:  1, material: iceM))
        ice.addChildNode(tag("IceBarrierLayer", y: rise + 0.22, color: .systemIndigo))
        root.addChildNode(ice)

        // ===== Underlayment (full slope) =====
        let under = SCNNode(); under.name = "UnderlaymentLayer"
        let underM = underMat()
        under.addChildNode(slopeSlab(width: slopeLen, height: underThk, length: depthWithEave, side: -1, material: underM))
        under.addChildNode(slopeSlab(width: slopeLen, height: underThk, length: depthWithEave, side:  1, material: underM))
        under.addChildNode(tag("UnderlaymentLayer", y: rise + 0.28, color: .darkGray))
        root.addChildNode(under)

        // ===== Flashing (drip edges) =====
        let flashing = SCNNode(); flashing.name = "FlashingLayer"
        let metalM = metal()
        // Eave drip (front/back) – under underlayment (we just render visually at eave)
        func eaveDrip(z: CGFloat) -> SCNNode {
            let g = SCNBox(width: 2*runPerSide + 2*rakeOverhang, height: 0.01, length: 0.02, chamferRadius: 0)
            g.materials = [metalM]
            let n = SCNNode(geometry: g); n.position = SCNVector3(0, -0.004, z)
            n.name = "Drip_Eave"
            return n
        }
        flashing.addChildNode(eaveDrip(z: -depth/2 - eaveOverhang))
        flashing.addChildNode(eaveDrip(z:  depth/2 + eaveOverhang))
        // Rake drip (left/right) – over underlayment at rakes
        func rakeDrip(side: CGFloat) -> SCNNode {
            let g = SCNBox(width: 0.02, height: 0.01, length: depthWithEave, chamferRadius: 0)
            g.materials = [metalM]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(side * (runPerSide + rakeOverhang), 0.02, 0)
            n.name = side < 0 ? "Drip_RakeL" : "Drip_RakeR"
            return n
        }
        flashing.addChildNode(rakeDrip(side: -1))
        flashing.addChildNode(rakeDrip(side:  1))
        flashing.addChildNode(tag("FlashingLayer", y: rise + 0.34, color: .systemTeal))
        root.addChildNode(flashing)

        // ===== Covering (starter + courses) =====
        let cover = SCNNode(); cover.name = "CoveringLayer"
        let sh = shingle()
        // Starter strip at eaves
        func starter(side: CGFloat) -> SCNNode {
            return slopeSlab(width: courseExposure, height: starterThk, length: depthWithEave, side: side, material: sh)
        }
        cover.addChildNode(starter(side: -1))
        cover.addChildNode(starter(side:  1))
        // Courses up the slope
        let usable = slopeLen - courseExposure
        let count = max(1, Int(usable / courseExposure))
        for i in 0..<count {
            let course = slopeSlab(width: courseExposure, height: shingleThk, length: depthWithEave, side: -1, material: (i % 2 == 0 ? sh : sh.copy() as! SCNMaterial))
            course.localTranslate(by: SCNVector3(Float(courseExposure * CGFloat(i+1)), 0, 0))
            course.name = "CourseL_\(i+1)"
            cover.addChildNode(course)
            let courseR = slopeSlab(width: courseExposure, height: shingleThk, length: depthWithEave, side:  1, material: (i % 2 == 0 ? sh : sh.copy() as! SCNMaterial))
            courseR.localTranslate(by: SCNVector3(Float(courseExposure * CGFloat(i+1)), 0, 0))
            courseR.name = "CourseR_\(i+1)"
            cover.addChildNode(courseR)
        }
        cover.addChildNode(tag("CoveringLayer", y: rise + 0.40, color: .black))
        root.addChildNode(cover)

        // ===== Ridge Cap =====
        let ridgeCap = SCNNode(); ridgeCap.name = "RidgeCapLayer"
        let capLen = depthWithEave
        let capWidth: CGFloat = 0.16
        let capOverlap: CGFloat = 0.04
        let step = capWidth - capOverlap
        let capCount = max(1, Int(capLen / step))
        for i in 0..<capCount {
            let g = SCNBox(width: capWidth, height: shingleThk, length: capWidth, chamferRadius: 0.01)
            g.materials = [sh]
            let n = SCNNode(geometry: g)
            n.position = SCNVector3(0, rise + 0.022, (-capLen/2) + CGFloat(i) * step)
            n.eulerAngles.x = Float.pi/2
            n.name = "RidgeCap_\(i+1)"
            ridgeCap.addChildNode(n)
        }
        ridgeCap.addChildNode(tag("RidgeCapLayer", y: rise + 0.46, color: .black))
        root.addChildNode(ridgeCap)

        // ===== Ventilation (ridge vent) =====
        let ventLayer = SCNNode(); ventLayer.name = "VentilationLayer"
        let vent = SCNBox(width: 0.10, height: 0.025, length: depth * 0.85, chamferRadius: 0.004)
        let vm = SCNMaterial(); vm.diffuse.contents = UIColor(white: 0.12, alpha: 1)
        vent.materials = [vm]
        let vNode = SCNNode(geometry: vent)
        vNode.position = SCNVector3(0, rise + 0.018, 0); vNode.name = "RidgeVent"
        ventLayer.addChildNode(vNode)
        ventLayer.addChildNode(tag("VentilationLayer", y: rise + 0.52, color: .systemBlue))
        root.addChildNode(ventLayer)

        // Set initial placement
        root.position = SCNVector3(0, -0.05, 0)
        return root
    }

    // Exploded offsets for teaching
    static func applyExploded(root: SCNNode, t: CGFloat) {
        func off(_ y: Float) -> SCNVector3 { SCNVector3(0, y, 0) }
        root.childNode(withName: "FramingLayer", recursively: true)?.position = off(0)
        root.childNode(withName: "DeckingLayer", recursively: true)?.position = off(Float(0.05 * t))
        root.childNode(withName: "IceBarrierLayer", recursively: true)?.position = off(Float(0.10 * t))
        root.childNode(withName: "UnderlaymentLayer", recursively: true)?.position = off(Float(0.15 * t))
        root.childNode(withName: "FlashingLayer", recursively: true)?.position = off(Float(0.20 * t))
        root.childNode(withName: "CoveringLayer", recursively: true)?.position = off(Float(0.26 * t))
        root.childNode(withName: "RidgeCapLayer", recursively: true)?.position = off(Float(0.31 * t))
        root.childNode(withName: "VentilationLayer", recursively: true)?.position = off(Float(0.36 * t))
    }

    // Billboard label
    static func tag(_ text: String, y: CGFloat, color: UIColor) -> SCNNode {
        let container = SCNNode(); container.name = "Label"
        let bg = SCNPlane(width: 0.28, height: 0.06)
        let bgM = SCNMaterial(); bgM.diffuse.contents = UIColor.black.withAlphaComponent(0.35)
        bg.cornerRadius = 0.012; bg.materials = [bgM]
        let bgN = SCNNode(geometry: bg); bgN.position = SCNVector3(0, Float(y), 0)
        let tt = SCNText(string: text, extrusionDepth: 0.001)
        tt.font = UIFont.systemFont(ofSize: 0.12, weight: .bold); tt.materials = [label(color)]
        let tN = SCNNode(geometry: tt); tN.scale = SCNVector3(0.01, 0.01, 0.01)
        let (mn, mx) = tt.boundingBox
        tN.pivot = SCNMatrix4MakeTranslation((mn.x+mx.x)/2, mn.y, (mn.z+mx.z)/2)
        tN.position = SCNVector3(0, Float(y), 0.001)
        let bb = SCNBillboardConstraint(); bb.freeAxes = .Y
        bgN.constraints = [bb]; tN.constraints = [bb]
        container.addChildNode(bgN); container.addChildNode(tN)
        return container
    }
}
