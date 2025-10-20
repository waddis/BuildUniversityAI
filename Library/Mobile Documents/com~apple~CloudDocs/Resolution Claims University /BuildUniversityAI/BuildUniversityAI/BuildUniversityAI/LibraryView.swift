import SwiftUI

struct LibraryView: View {
    @State private var savedLessons: [Lesson] = []
    
    var body: some View {
        NavigationStack {
            Group {
                if savedLessons.isEmpty {
                    ContentUnavailableView(
                        "No Saved Lessons",
                        systemImage: "folder",
                        description: Text("Save lessons from the Learn section to access them here")
                    )
                } else {
                    List(savedLessons) { lesson in
                        NavigationLink(value: lesson.id) {
                            LibraryLessonRowView(lesson: lesson)
                        }
                    }
                    .navigationDestination(for: String.self) { id in
                        if let lesson = savedLessons.first(where: { $0.id == id }) {
                            LessonDetailView(lesson: lesson)
                        } else {
                            Text("Lesson not found")
                        }
                    }
                }
            }
            .navigationTitle("Library")
        }
    }
}

struct LibraryLessonRowView: View {
    let lesson: Lesson
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(lesson.title)
                .font(.headline)
            Text(lesson.summary)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(2)
            if let cite = lesson.citations.first {
                Text("\(cite.publisher) • \(cite.source)\(cite.section.map { " \($0)" } ?? "") • \(cite.year)")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    NavigationStack {
        LibraryView()
    }
}