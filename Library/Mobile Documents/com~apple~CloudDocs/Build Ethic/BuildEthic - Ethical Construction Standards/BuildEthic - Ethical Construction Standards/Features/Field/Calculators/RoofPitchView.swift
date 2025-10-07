import SwiftUI

struct RoofPitchView: View {
    @State private var rise = 6.0
    @State private var run = 12.0
    
    var pitch: Double { rise / run }
    var pitchRatio: String { "\(Int(rise)):\(Int(run))" }
    var angle: Double { atan(pitch) * 180 / .pi }
    
    var body: some View {
        Form {
            Section("Roof Dimensions") {
                Stepper("Rise (in): \(Int(rise))", 
                       value: $rise, in: 1...24, step: 1)
                Stepper("Run (in): \(Int(run))", 
                       value: $run, in: 6...24, step: 1)
            }
            
            Section("Pitch Results") {
                HStack {
                    Text("Pitch Ratio:")
                    Spacer()
                    Text(pitchRatio)
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("Pitch (decimal):")
                    Spacer()
                    Text("\(pitch, specifier: "%.3f")")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("Angle:")
                    Spacer()
                    Text("\(angle, specifier: "%.1f")°")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
            }
            
            Section("Common Pitches") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("4:12 = 18.4° (Low slope)")
                    Text("6:12 = 26.6° (Common residential)")
                    Text("8:12 = 33.7° (Steep)")
                    Text("12:12 = 45° (Very steep)")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
        }
        .navigationTitle("Roof Pitch Calculator")
        .navigationBarTitleDisplayMode(.inline)
    }
}

