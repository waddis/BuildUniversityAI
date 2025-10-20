import SwiftUI

struct CodesView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                Image(systemName: "building.columns")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                
                Text("Jurisdiction Data")
                    .font(.title)
                    .bold()
                
                Text("Jurisdiction data appears once adoption sources are verified.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
                
                VStack(alignment: .leading, spacing: 12) {
                    Text("Coming Soon:")
                        .font(.headline)
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Label("State Code Adoptions", systemImage: "checkmark.circle")
                        Label("Local Amendments", systemImage: "checkmark.circle")
                        Label("Climate Zone Data", systemImage: "checkmark.circle")
                        Label("Hazard Information", systemImage: "checkmark.circle")
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
                
                Spacer()
            }
            .padding()
            .navigationTitle("Codes")
        }
    }
}

#Preview {
    NavigationStack {
        CodesView()
    }
}