import SwiftUI

struct LearnView: View {
    let lessons = SeedData.lessons
    @State private var path: [Lesson] = []

    var body: some View {
        NavigationStack(path: $path) {
            List(lessons) { lesson in
                NavigationLink(value: lesson) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(lesson.title).font(.headline)
                        Text(lesson.summary).font(.subheadline).foregroundStyle(.secondary)
                        if let cite = lesson.citations.first {
                            Text("\(cite.publisher) • \(cite.source)\(cite.section.map { " \($0)" } ?? "") • \(cite.year)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Learn")
            .navigationDestination(for: Lesson.self) { lesson in
                LessonDetailView(lesson: lesson) // shows real steps, media, citations
            }
        }
    }
}

#Preview {
    LearnView()
}