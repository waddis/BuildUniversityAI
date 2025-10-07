import SwiftUI

struct CEUTranscriptView: View {
    @State private var ceuRecords: [CEURecord] = []
    @State private var totalCEUs: Double = 0.0
    
    var body: some View {
        NavigationView {
            List {
                Section("CEU Summary") {
                    HStack {
                        Text("Total CEUs Earned:")
                        Spacer()
                        Text("\(totalCEUs, specifier: "%.2f")")
                            .font(.title2)
                            .bold()
                            .foregroundColor(.blue)
                    }
                }
                
                Section("Recent Activity") {
                    if ceuRecords.isEmpty {
                        Text("No CEU records yet")
                            .foregroundColor(.secondary)
                            .italic()
                    } else {
                        ForEach(ceuRecords) { record in
                            CEURecordRow(record: record)
                        }
                    }
                }
            }
            .navigationTitle("CEU Transcript")
            .task {
                loadCEURecords()
            }
        }
    }
    
    private func loadCEURecords() {
        // Mock data for now
        ceuRecords = [
            CEURecord(
                id: "1",
                courseName: "Safety Fundamentals",
                ceuHours: 2.0,
                completedDate: Calendar.current.date(byAdding: .day, value: -5, to: Date()) ?? Date(),
                status: .completed
            ),
            CEURecord(
                id: "2",
                courseName: "Tool Literacy",
                ceuHours: 1.5,
                completedDate: Calendar.current.date(byAdding: .day, value: -10, to: Date()) ?? Date(),
                status: .completed
            ),
            CEURecord(
                id: "3",
                courseName: "Materials 101",
                ceuHours: 1.0,
                completedDate: Calendar.current.date(byAdding: .day, value: -15, to: Date()) ?? Date(),
                status: .completed
            )
        ]
        
        totalCEUs = ceuRecords.reduce(0) { $0 + $1.ceuHours }
    }
}

struct CEURecord: Identifiable {
    let id: String
    let courseName: String
    let ceuHours: Double
    let completedDate: Date
    let status: CEUStatus
}

enum CEUStatus: String, CaseIterable {
    case completed, pending, failed
}

struct CEURecordRow: View {
    let record: CEURecord
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(record.courseName)
                    .font(.headline)
                
                Text(record.completedDate, style: .date)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text("\(record.ceuHours, specifier: "%.1f") CEUs")
                    .font(.subheadline)
                    .bold()
                    .foregroundColor(.blue)
                
                Text(record.status.rawValue.capitalized)
                    .font(.caption)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(statusColor.opacity(0.2))
                    .foregroundColor(statusColor)
                    .clipShape(Capsule())
            }
        }
        .padding(.vertical, 4)
    }
    
    private var statusColor: Color {
        switch record.status {
        case .completed: return .green
        case .pending: return .orange
        case .failed: return .red
        }
    }
}

