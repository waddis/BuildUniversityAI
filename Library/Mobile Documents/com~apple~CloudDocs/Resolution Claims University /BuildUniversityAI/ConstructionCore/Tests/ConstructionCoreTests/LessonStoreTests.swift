import XCTest
@testable import Lessons

final class LessonStoreTests: XCTestCase {
    func testLoadIndex() throws {
        let ids = try LessonStore.shared.loadIndex()
        XCTAssertFalse(ids.isEmpty)
    }

    func testLoadLesson() throws {
        _ = try LessonStore.shared.loadLesson(named: "roof_asphalt_shingle")
    }
}

