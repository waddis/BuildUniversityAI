import SwiftUI

struct ExploreView: View {
    @State private var selectedDemo: ARDemo?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Hero Section
                    VStack(spacing: 12) {
                        Image(systemName: "arkit")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        
                        Text("AR Exploration")
                            .font(.largeTitle)
                            .bold()
                        
                        Text("Discover construction assessment through augmented reality")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)
                    
                    // Interactive Demos Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Interactive Demos")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            ForEach(ARDemo.allCases) { demo in
                                DemoCard(
                                    demo: demo,
                                    onTap: { selectedDemo = demo }
                                )
                            }
                        }
                        .padding(.horizontal)
                    }
                    
                    // AR Instructions
                    VStack(spacing: 12) {
                        Text("How to Use AR")
                            .font(.headline)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Label("Point your device at a flat surface", systemImage: "viewfinder")
                            Label("Tap to place the 3D model", systemImage: "hand.tap")
                            Label("Pinch to zoom, drag to rotate", systemImage: "arrow.up.left.and.arrow.down.right")
                            Label("Use AR mode for immersive learning", systemImage: "arkit")
                        }
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(.regularMaterial)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(.quaternary, lineWidth: 1)
                    )
                    .padding(.horizontal)
                    
                    Spacer(minLength: 20)
                }
            }
            .navigationTitle("Explore")
            .sheet(item: $selectedDemo) { demo in
                ARDemoView(demo: demo)
            }
        }
    }
}

enum ARDemo: String, CaseIterable, Identifiable {
    case roofAssessment = "roof"
    case waterIntrusion = "water"
    case foundationCheck = "foundation"
    case electricalSafety = "electrical"
    
    var id: String { rawValue }
    
    var title: String {
        switch self {
        case .roofAssessment: return "Roof Assessment"
        case .waterIntrusion: return "Water Intrusion"
        case .foundationCheck: return "Foundation Check"
        case .electricalSafety: return "Electrical Safety"
        }
    }
    
    var description: String {
        switch self {
        case .roofAssessment: return "Identify hail damage patterns"
        case .waterIntrusion: return "Trace moisture paths"
        case .foundationCheck: return "Detect settlement issues"
        case .electricalSafety: return "Locate hazards safely"
        }
    }
    
    var icon: String {
        switch self {
        case .roofAssessment: return "house.fill"
        case .waterIntrusion: return "drop.fill"
        case .foundationCheck: return "building.columns.fill"
        case .electricalSafety: return "bolt.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .roofAssessment: return .orange
        case .waterIntrusion: return .blue
        case .foundationCheck: return .brown
        case .electricalSafety: return .yellow
        }
    }
}

struct DemoCard: View {
    let demo: ARDemo
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 12) {
                Image(systemName: demo.icon)
                    .font(.system(size: 30))
                    .foregroundColor(demo.color)
                
                Text(demo.title)
                    .font(.headline)
                    .multilineTextAlignment(.center)
                
                Text(demo.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(.regularMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(.quaternary, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct ARDemoView: View {
    let demo: ARDemo
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: demo.icon)
                    .font(.system(size: 80))
                    .foregroundColor(demo.color)
                
                Text(demo.title)
                    .font(.largeTitle)
                    .bold()
                
                Text(demo.description)
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                
                VStack(spacing: 16) {
                    Button("Start AR Experience") {
                        // TODO: Launch actual AR experience
                    }
                    .buttonStyle(.borderedProminent)
                    .controlSize(.large)
                    
                    Button("View 3D Model") {
                        // TODO: Show 3D model viewer
                    }
                    .buttonStyle(.bordered)
                    .controlSize(.large)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("AR Demo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        ExploreView()
    }
}