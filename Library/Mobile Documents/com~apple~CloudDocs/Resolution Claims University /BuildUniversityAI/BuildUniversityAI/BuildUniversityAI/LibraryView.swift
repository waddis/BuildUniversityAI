import SwiftUI

struct LibraryView: View {
    @State private var savedLessons: [Lesson] = []
    @State private var searchText = ""
    
    private var filteredLessons: [Lesson] {
        if searchText.isEmpty {
            return savedLessons
        } else {
            return savedLessons.filter { lesson in
                lesson.title.localizedCaseInsensitiveContains(searchText) ||
                lesson.summary.localizedCaseInsensitiveContains(searchText)
            }
        }
    }
    
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
                    List(filteredLessons) { lesson in
                        NavigationLink(value: lesson.id) {
                            LibraryLessonRowView(lesson: lesson)
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button("Remove", role: .destructive) {
                                removeLesson(lesson)
                            }
                        }
                    }
                    .searchable(text: $searchText, prompt: "Search saved lessons")
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
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Clear All", role: .destructive) {
                            clearAllLessons()
                        }
                        .disabled(savedLessons.isEmpty)
                        
                        Button("Add Sample Lessons") {
                            addSampleLessons()
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .onAppear {
            loadSavedLessons()
        }
    }
    
    private func loadSavedLessons() {
        // TODO: Load from persistent storage
        // For now, load some sample lessons
        savedLessons = SeedData.lessons.prefix(2).map { $0 }
    }
    
    private func removeLesson(_ lesson: Lesson) {
        withAnimation {
            savedLessons.removeAll { $0.id == lesson.id }
        }
    }
    
    private func clearAllLessons() {
        withAnimation {
            savedLessons.removeAll()
        }
    }
    
    private func addSampleLessons() {
        withAnimation {
            savedLessons = SeedData.lessons
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