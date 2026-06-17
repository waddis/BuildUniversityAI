import Foundation

enum Endpoints {
    // Auth
    static let login = "auth/login"
    static let register = "auth/register"
    static let me = "auth/me"
    static let magicLink = "auth/request-magic-link"

    // Projects
    static let projects = "projects"
    static func project(_ id: String) -> String { "projects/\(id)" }
    static func projectMedia(_ id: String) -> String { "media/projects/\(id)" }
    static func projectTasks(_ id: String) -> String { "tasks/projects/\(id)" }
    static func projectNotes(_ id: String) -> String { "notes/projects/\(id)" }
    static func projectComments(_ id: String) -> String { "comments/projects/\(id)" }
    static func projectReports(_ id: String) -> String { "reports/projects/\(id)" }

    // Media
    static let uploadURL = "media/upload-url"
    static let media = "media"
    static func mediaItem(_ id: String) -> String { "media/\(id)" }
    static func mediaComments(_ id: String) -> String { "comments/media/\(id)" }

    // Tasks
    static func task(_ id: String) -> String { "tasks/\(id)" }

    // Reports
    static func report(_ id: String) -> String { "reports/\(id)" }
    static func reportGenerate(_ id: String) -> String { "reports/\(id)/generate" }

    // Activity
    static let activity = "search/activity"

    // Notes
    static func note(_ id: String) -> String { "notes/\(id)" }

    // Company
    static let currentCompany = "companies/current"
    static let members = "companies/current/members"
    static let invite = "companies/current/invite"

    // Users
    static let deleteMe = "users/me"

    // Notifications
    static let notifications = "notifications"
    static func notificationRead(_ id: String) -> String { "notifications/\(id)/read" }
}
