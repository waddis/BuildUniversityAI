import SwiftUI

// MARK: - Usage Examples for ModelViewerButton

struct ModelViewerExamples: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("ModelViewerButton Examples")
                    .font(.largeTitle)
                    .bold()
                
                // Example 1: Bundled asset
                VStack(alignment: .leading, spacing: 8) {
                    Text("Bundled Asset")
                        .font(.headline)
                    Text("Put `afci_panel.usdz` in your project and check Target Membership")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    ModelViewerButton(
                        title: "View 3D Model",
                        source: .named("afci_panel"),
                        caption: "Spin, pinch-zoom, or place in AR."
                    )
                }
                .padding()
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                
                // Example 2: Remote asset
                VStack(alignment: .leading, spacing: 8) {
                    Text("Remote Asset")
                        .font(.headline)
                    Text("Downloads and caches for offline viewing")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    ModelViewerButton(
                        title: "Open 3D Meter Base",
                        source: .remote(URL(string: "https://example.org/models/meter_base.usdz")!),
                        caption: "Cached for offline viewing after first open."
                    )
                }
                .padding()
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
                
                // Example 3: Custom styling
                VStack(alignment: .leading, spacing: 8) {
                    Text("Custom Styling")
                        .font(.headline)
                    Text("The button adapts to your app's design")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    
                    ModelViewerButton(
                        title: "Electrical Panel",
                        source: .named("electrical_panel"),
                        caption: "Interactive 3D electrical panel model"
                    )
                }
                .padding()
                .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 12))
            }
            .padding()
        }
    }
}

#Preview {
    ModelViewerExamples()
}

