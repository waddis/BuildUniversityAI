import SwiftUI

struct ExploreView: View {
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
                    
                    // Quick Demos Section
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Quick Demos")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 16) {
                            DemoCard(
                                title: "Roof Assessment",
                                description: "Identify hail damage patterns",
                                icon: "house.fill",
                                color: .orange
                            )
                            
                            DemoCard(
                                title: "Water Intrusion",
                                description: "Trace moisture paths",
                                icon: "drop.fill",
                                color: .blue
                            )
                            
                            DemoCard(
                                title: "Foundation Check",
                                description: "Detect settlement issues",
                                icon: "building.columns.fill",
                                color: .brown
                            )
                            
                            DemoCard(
                                title: "Electrical Safety",
                                description: "Locate hazards safely",
                                icon: "bolt.fill",
                                color: .yellow
                            )
                        }
                        .padding(.horizontal)
                    }
                    
                    // Coming Soon Section
                    VStack(spacing: 12) {
                        Text("More AR Experiences")
                            .font(.headline)
                        
                        Text("Additional interactive demos and guided assessments are coming soon. Stay tuned for updates!")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                    .padding(.vertical, 20)
                }
            }
            .navigationTitle("Explore")
        }
    }
}

struct DemoCard: View {
    let title: String
    let description: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(color)
            
            Text(title)
                .font(.headline)
                .multilineTextAlignment(.center)
            
            Text(description)
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
}

#Preview {
    NavigationStack {
        ExploreView()
    }
}