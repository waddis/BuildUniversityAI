import Foundation

public enum LessonStoreError: Error { case notFound, decodeFailed(Error) }

public final class LessonStore {
    public static let shared = LessonStore()
    private init() {}

    public func loadIndex() throws -> [String] {
        guard let url = Bundle.module.url(forResource: "index", withExtension: "json") else { throw LessonStoreError.notFound }
        let data = try Data(contentsOf: url)
        return try JSONDecoder().decode([String].self, from: data)
    }

    public func loadLesson(named name: String) throws -> Lesson {
        guard let url = Bundle.module.url(forResource: name, withExtension: "json") else { throw LessonStoreError.notFound }
        let data = try Data(contentsOf: url)
        do { return try JSONDecoder().decode(Lesson.self, from: data) }
        catch { throw LessonStoreError.decodeFailed(error) }
    }
}
