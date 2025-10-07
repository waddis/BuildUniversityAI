import Foundation

// Mock LMS Service for Development
class MockLMSService {
    static let shared = MockLMSService()
    private init() {}
    
    func launchLesson(courseId: String, lessonId: String?) async throws -> (token: String, url: URL) {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // Return a mock lesson URL (could be a local HTML file or a simple web view)
        let mockToken = "mock_token_\(UUID().uuidString)"
        let mockURL = URL(string: "data:text/html,<html><body><h1>Mock Lesson: \(courseId)</h1><p>This is a development mock lesson. In production, this would load the actual SCORM content.</p><p>Course ID: \(courseId)</p><p>Lesson ID: \(lessonId ?? "N/A")</p></body></html>")!
        
        return (token: mockToken, url: mockURL)
    }
}
