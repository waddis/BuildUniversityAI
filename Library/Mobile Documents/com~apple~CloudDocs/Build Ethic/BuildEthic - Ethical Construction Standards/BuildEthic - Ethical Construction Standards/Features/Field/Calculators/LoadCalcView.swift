import SwiftUI

struct LoadCalcView: View {
    @State private var length = 10.0
    @State private var width = 10.0
    @State private var liveLoad = 40.0 // psf
    @State private var deadLoad = 10.0 // psf
    
    var area: Double { length * width }
    var totalLoad: Double { (liveLoad + deadLoad) * area }
    var liveLoadTotal: Double { liveLoad * area }
    var deadLoadTotal: Double { deadLoad * area }
    
    var body: some View {
        Form {
            Section("Dimensions") {
                Stepper("Length (ft): \(length, specifier: "%.1f")", 
                       value: $length, in: 1...100, step: 0.5)
                Stepper("Width (ft): \(width, specifier: "%.1f")", 
                       value: $width, in: 1...100, step: 0.5)
            }
            
            Section("Load Values (psf)") {
                Stepper("Live Load: \(liveLoad, specifier: "%.0f") psf", 
                       value: $liveLoad, in: 20...100, step: 5)
                Stepper("Dead Load: \(deadLoad, specifier: "%.0f") psf", 
                       value: $deadLoad, in: 5...50, step: 5)
            }
            
            Section("Calculations") {
                HStack {
                    Text("Area:")
                    Spacer()
                    Text("\(area, specifier: "%.1f") sq ft")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("Live Load Total:")
                    Spacer()
                    Text("\(liveLoadTotal, specifier: "%.0f") lbs")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("Dead Load Total:")
                    Spacer()
                    Text("\(deadLoadTotal, specifier: "%.0f") lbs")
                        .font(.headline)
                        .foregroundColor(.blue)
                }
                
                HStack {
                    Text("Total Load:")
                    Spacer()
                    Text("\(totalLoad, specifier: "%.0f") lbs")
                        .font(.title2)
                        .bold()
                        .foregroundColor(.red)
                }
            }
            
            Section("Load Guidelines") {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Residential: 40 psf live load")
                    Text("Commercial: 50 psf live load")
                    Text("Storage: 60+ psf live load")
                    Text("Dead load includes structure weight")
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
        }
        .navigationTitle("Load Calculator")
        .navigationBarTitleDisplayMode(.inline)
    }
}

