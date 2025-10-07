import SwiftUI

struct InspectionChecklistView: View {
    @State private var items = [
        ("Foundation level and square", false),
        ("Framing plumb and level", false),
        ("Electrical rough-in complete", false),
        ("Plumbing rough-in complete", false),
        ("Insulation properly installed", false),
        ("Vapor barrier continuous", false),
        ("Windows and doors square", false),
        ("Roof sheathing secure", false),
        ("Flashing properly installed", false),
        ("Cleanup completed", false)
    ]
    
    @State private var inspector = ""
    @State private var projectName = ""
    @State private var notes = ""
    @State private var showingSubmitAlert = false
    
    var completedCount: Int { items.filter { $0.1 }.count }
    var totalCount: Int { items.count }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Project Info") {
                    TextField("Project Name", text: $projectName)
                    TextField("Inspector Name", text: $inspector)
                }
                
                Section("Inspection Items") {
                    ForEach(items.indices, id: \.self) { index in
                        Toggle(items[index].0, isOn: $items[index].1)
                    }
                }
                
                Section("Progress") {
                    HStack {
                        Text("Completed:")
                        Spacer()
                        Text("\(completedCount)/\(totalCount)")
                            .font(.headline)
                            .foregroundColor(completedCount == totalCount ? .green : .orange)
                    }
                    
                    ProgressView(value: Double(completedCount), total: Double(totalCount))
                        .progressViewStyle(LinearProgressViewStyle())
                }
                
                Section("Notes") {
                    TextField("Inspection notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section {
                    Button("Submit Inspection") {
                        showingSubmitAlert = true
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(completedCount < totalCount || inspector.isEmpty || projectName.isEmpty)
                }
            }
            .navigationTitle("Inspection Checklist")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Submit Inspection", isPresented: $showingSubmitAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Submit") {
                    submitInspection()
                }
            } message: {
                Text("Are you sure you want to submit this inspection checklist?")
            }
        }
    }
    
    private func submitInspection() {
        // Save to Core Data and sync to server
        print("Inspection submitted for project: \(projectName)")
        // Reset form
        items = items.map { ($0.0, false) }
        notes = ""
        inspector = ""
        projectName = ""
    }
}

