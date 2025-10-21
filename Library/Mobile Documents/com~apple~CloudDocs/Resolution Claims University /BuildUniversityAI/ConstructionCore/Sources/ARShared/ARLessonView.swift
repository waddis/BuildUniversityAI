import SwiftUI
import RealityKit
#if canImport(ARKit)
import ARKit
#endif
import CoreModels
import SharedUI

public final class ARSceneHost: ObservableObject {
    public init() {}
    public func loadScene(named: String) async throws { /* placeholder */ }
    public func setLayersVisible(_ layers: [String], visible: Bool) { /* placeholder */ }
    public func playAnimation(forKey: String) { /* placeholder */ }
    public func reset() {}
}

public struct ARLessonView: View {
    public let lesson: Lesson
    @StateObject private var host = ARSceneHost()

    public init(lesson: Lesson) { self.lesson = lesson }

    public var body: some View {
        ZStack {
            // Placeholder canvas until real ARView is integrated
            Rectangle().fill(.black.opacity(0.06))
            VStack(spacing: 8) {
                Text("AR Placeholder")
                Text(lesson.system + " • " + lesson.module).font(.footnote).foregroundStyle(.secondary)
            }
        }
        .overlay(alignment: .bottomLeading) {
            if let refs = lesson.steps.first?.codeRefs, !refs.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(refs, id: \.self) { CodeChip(ref: $0) }
                    }.padding(8)
                }
            }
        }
    }
}
