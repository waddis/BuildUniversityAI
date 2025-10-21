import SwiftUI
import CoreModels

public struct CodeChip: View {
    public let ref: CodeReference
    public init(ref: CodeReference) { self.ref = ref }

    public var body: some View {
        HStack(spacing: 6) {
            Text(ref.family.rawValue).font(.caption2).padding(.horizontal, 6).padding(.vertical, 2)
                .background(Capsule().fill(Color.blue.opacity(0.15)))
            Text("\(ref.edition) \(ref.section)")
                .font(.caption2).foregroundStyle(.secondary)
        }
        .padding(6)
        .background(RoundedRectangle(cornerRadius: 8).stroke(.quaternary))
    }
}