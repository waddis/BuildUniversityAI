import Foundation

public enum CodeFamily: String, Codable { case IRC, IECC, NEC, IMC, IPC, ASCE7, FEMA, STATE, LOCAL, MANUFACTURER }

public struct CodeReference: Codable, Hashable {
    public let family: CodeFamily
    public let edition: String
    public let section: String
    public let title: String
    public let url: URL?
    public init(family: CodeFamily, edition: String, section: String, title: String, url: URL? = nil) {
        self.family = family; self.edition = edition; self.section = section; self.title = title; self.url = url
    }
}

public struct LessonStep: Codable, Identifiable, Hashable {
    public let id: String
    public let title: String
    public let caption: String
    public let animationKey: String
    public let codeRefs: [CodeReference]
    public let layerTags: [String]
}

public struct Lesson: Codable, Identifiable, Hashable {
    public let id: String
    public let system: String
    public let module: String
    public let title: String
    public let objectives: [String]
    public let steps: [LessonStep]
    public let estimatedMinutes: Int
    public let editionNotes: String?
}

