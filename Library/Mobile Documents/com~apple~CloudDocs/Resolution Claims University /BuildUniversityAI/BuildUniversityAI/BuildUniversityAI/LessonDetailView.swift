import SwiftUI

struct LessonDetailView: View {
    let lesson: Lesson
    @State private var isSaved = false
    @State private var showARLesson = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(lesson.title).font(.title).bold()
                Text(lesson.summary).font(.body)

                // Action Buttons
                HStack(spacing: 12) {
                    Button(action: toggleSaved) {
                        HStack {
                            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                            Text(isSaved ? "Saved" : "Save")
                        }
                    }
                    .buttonStyle(.bordered)
                    
                    Button("Start AR Lesson") {
                        showARLesson = true
                    }
                    .buttonStyle(.borderedProminent)
                    
                    Spacer()
                }
                .padding(.vertical, 8)

                ForEach(lesson.steps) { step in
                    SwiftUI.Section {
                        VStack(alignment: .leading, spacing: 12) {
                            Text(step.title).font(.headline)
                            Text(step.body).font(.body)
                            MediaGrid(items: step.media)   // <— gallery
                        }
                    } header: {
                        Text("Step").font(.caption).foregroundStyle(.secondary)
                    }
                }

                SwiftUI.Section {
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(Array(lesson.citations), id: \.self) { c in
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(c.publisher) • \(c.source)\(c.section.map { " \($0)" } ?? "") • \(c.year)")
                                    .font(.subheadline)
                                if let u = c.url { Link("View Source", destination: u).font(.caption) }
                            }
                        }
                    }
                } header: {
                    Text("Citations").font(.headline)
                }

                Text("This guidance summarizes published code text. Verify your jurisdiction's adopted edition and amendments.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
            .padding()
        }
        .navigationTitle(lesson.title)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showARLesson) {
            ARLessonScreen(lesson: lesson)
        }
        .onAppear {
            checkIfSaved()
        }
    }
    
    private func toggleSaved() {
        withAnimation {
            isSaved.toggle()
            // TODO: Implement actual save/unsave functionality
            // For now, just toggle the UI state
        }
    }
    
    private func checkIfSaved() {
        // TODO: Check if lesson is saved in persistent storage
        // For now, randomly set some lessons as saved
        isSaved = lesson.id.contains("gfci") || lesson.id.contains("smoke")
    }
}

#Preview {
    NavigationStack {
        LessonDetailView(lesson: SeedData.lessons.first!)
    }
}