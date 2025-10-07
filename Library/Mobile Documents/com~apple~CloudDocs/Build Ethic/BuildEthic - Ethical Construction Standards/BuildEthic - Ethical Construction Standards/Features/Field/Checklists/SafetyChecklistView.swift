import SwiftUI

struct SafetyChecklistView: View {
    @State private var items = [
        ("PPE worn (glasses, gloves, boots)", false),
        ("Area cleared & marked", false),
        ("Ladder set 4:1 and secured", false),
        ("GFCI protection verified", false),
        ("Tools inspected before use", false),
        ("Safety barriers in place", false),
        ("Emergency contact info posted", false),
        ("First aid kit accessible", false)
    ]
    
    @State private var notes = ""
    @State private var supervisor = ""
    @State private var showingSubmitAlert = false
    
    var completedCount: Int { items.filter { $0.1 }.count }
    var totalCount: Int { items.count }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Safety Checklist") {
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
                
                Section("Additional Info") {
                    TextField("Supervisor Name", text: $supervisor)
                    TextField("Notes (optional)", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                }
                
                Section {
                    Button("Submit Safety Checklist") {
                        showingSubmitAlert = true
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(completedCount < totalCount)
                }
            }
            .navigationTitle("Safety Check")
            .navigationBarTitleDisplayMode(.inline)
            .alert("Submit Checklist", isPresented: $showingSubmitAlert) {
                Button("Cancel", role: .cancel) { }
                Button("Submit") {
                    submitChecklist()
                }
            } message: {
                Text("Are you sure you want to submit this safety checklist?")
            }
        }
    }
    
    private func submitChecklist() {
        // Save to Core Data and sync to server
        print("Safety checklist submitted with \(completedCount)/\(totalCount) items completed")
        // Reset form
        items = items.map { ($0.0, false) }
        notes = ""
        supervisor = ""
    }
}

