import SwiftUI

struct CourseDetailView: View {
    let course: CourseVM
    @State private var selectedLesson: LessonVM?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 12) {
                    Text(course.title)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    HStack {
                        Text(course.category)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(categoryColor.opacity(0.2))
                            .foregroundColor(categoryColor)
                            .clipShape(Capsule())
                        
                        Spacer()
                        
                        VStack(alignment: .trailing) {
                            Text("\(course.ceu, specifier: "%.1f") CEU")
                                .font(.headline)
                                .foregroundColor(.blue)
                            
                            Text(course.level)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Text(course.description)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Course Stats
                HStack(spacing: 30) {
                    VStack {
                        Text("\(course.lessons.count)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.green)
                        Text("Lessons")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        let totalDuration = course.lessons.reduce(0) { $0 + $1.durationMin }
                        Text("\(totalDuration)")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.orange)
                        Text("Minutes")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    VStack {
                        Text("\(course.ceu, specifier: "%.1f")")
                            .font(.title2)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                        Text("CEU Credits")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                
                // Lessons
                VStack(alignment: .leading, spacing: 16) {
                    Text("Lessons")
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    ForEach(course.lessons) { lesson in
                        LessonCardView(lesson: lesson) {
                            selectedLesson = lesson
                        }
                    }
                }
                
                // Start Course Button
                Button(action: {
                    // Start the first lesson
                    if let firstLesson = course.lessons.first {
                        selectedLesson = firstLesson
                    }
                }) {
                    HStack {
                        Image(systemName: "play.fill")
                        Text("Start Course")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
            .padding()
        }
        .navigationTitle("Course Details")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedLesson) { lesson in
            LessonPlayerView(courseId: course.id, lessonId: lesson.id)
        }
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

struct LessonCardView: View {
    let lesson: LessonVM
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    Text(lesson.title)
                        .font(.headline)
                        .foregroundColor(.primary)
                        .multilineTextAlignment(.leading)
                    
                    Text(lesson.objective)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                    
                    HStack {
                        Image(systemName: "wrench.fill")
                            .foregroundColor(.blue)
                            .font(.caption)
                        
                        Text(lesson.fieldIntegration)
                            .font(.caption)
                            .foregroundColor(.blue)
                        
                        Spacer()
                        
                        Text("\(lesson.durationMin) min")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
                    .font(.caption)
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(PlainButtonStyle())
    }
}
