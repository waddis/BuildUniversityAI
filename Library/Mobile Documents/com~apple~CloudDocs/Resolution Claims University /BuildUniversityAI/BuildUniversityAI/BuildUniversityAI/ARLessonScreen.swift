import SwiftUI

struct ARLessonScreen: View {
    let lesson: Lesson
    
    // Check for licensed AR assets
    private var hasLicensedARAssets: Bool {
        // Check if we have licensed USDZ models for this lesson
        lesson.steps.contains { step in
            step.media.contains { media in
                media.kind == .usdzAsset && 
                Bundle.main.url(forResource: media.nameOrURL, withExtension: "usdz") != nil
            }
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            if hasLicensedARAssets {
                // Placeholder for real AR view when licensed assets are available
                VStack(spacing: 8) {
                    Image(systemName: "arkit")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    Text("AR Experience")
                        .font(.headline)
                    Text("Licensed AR models available for \(lesson.title)")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.blue.opacity(0.1))
            } else {
                // AR disabled state
                VStack(spacing: 8) {
                    Image(systemName: "arkit")
                        .font(.system(size: 60))
                        .foregroundColor(.secondary)
                    Text("AR Disabled")
                        .font(.headline)
                    Text("No licensed model found for this lesson")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.gray.opacity(0.1))
            }

            Divider()

            // Lesson content with media
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    Text(lesson.title)
                        .font(.headline)
                    
                    Text(lesson.summary)
                        .font(.body)
                        .foregroundStyle(.secondary)
                    
                    ForEach(lesson.steps) { step in
                        VStack(alignment: .leading, spacing: 8) {
                            Text(step.title)
                                .font(.subheadline)
                                .bold()
                            Text(step.body)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            
                            // Show media for this step
                            if !step.media.isEmpty {
                                MediaGrid(items: step.media)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
                .padding()
            }
            .frame(maxHeight: 300)
        }
        .navigationTitle(lesson.title)
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview {
    NavigationStack {
        ARLessonScreen(lesson: SeedData.lessons.first!)
    }
}