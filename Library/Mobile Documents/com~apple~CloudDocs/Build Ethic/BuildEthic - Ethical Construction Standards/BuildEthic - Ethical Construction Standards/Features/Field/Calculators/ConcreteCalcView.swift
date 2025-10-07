import SwiftUI

struct ConcreteCalcView: View {
    @State private var length = 10.0
    @State private var width = 10.0
    @State private var depthIn = 4.0
    
    var yards: Double { 
        (length * width * (depthIn/12.0)) / 27.0 
    }
    
    var body: some View {
        Form {
            Section("Slab Dimensions") {
                Stepper("Length (ft): \(length, specifier: "%.1f")", 
                       value: $length, in: 1...500, step: 0.5)
                Stepper("Width (ft): \(width, specifier: "%.1f")", 
                       value: $width, in: 1...500, step: 0.5)
                Stepper("Depth (in): \(depthIn, specifier: "%.1f")", 
                       value: $depthIn, in: 1...24, step: 0.5)
            }
            
            Section("Order Quantity") { 
                Text("\(yards, specifier:"%.2f") cubic yards")
                    .font(.title2)
                    .bold()
                    .foregroundColor(.blue)
            }
            
            Section("Additional Info") {
                Text("Add 5-10% for waste and spillage")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("Standard concrete mix: 1 part cement, 2 parts sand, 3 parts gravel")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .navigationTitle("Concrete Calculator")
        .navigationBarTitleDisplayMode(.inline)
    }
}

