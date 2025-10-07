import SwiftUI

struct CourseCardView: View {
    let course: CourseVM
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(course.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    Text(course.category)
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(categoryColor.opacity(0.2))
                        .foregroundColor(categoryColor)
                        .clipShape(Capsule())
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(course.ceu, specifier: "%.1f") CEU")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                    
                    Text(course.level)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            
            // Description
            Text(course.description)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .lineLimit(2)
            
            // Lessons info
            HStack {
                Image(systemName: "book.fill")
                    .foregroundColor(.green)
                    .font(.caption)
                
                Text("\(course.lessons.count) lessons")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Spacer()
                
                let totalDuration = course.lessons.reduce(0) { $0 + $1.durationMin }
                Image(systemName: "clock.fill")
                    .foregroundColor(.orange)
                    .font(.caption)
                
                Text("\(totalDuration) min")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private var categoryColor: Color {
        switch course.category {
        case "Safety & Compliance":
            return .red
        case "Technical Skills":
            return .blue
        case "Compliance Training":
            return .purple
        case "Leadership & Communication":
            return .green
        case "Environmental Responsibility":
            return .mint
        default:
            return .gray
        }
    }
}
