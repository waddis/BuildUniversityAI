import SwiftUI

// Brand palette mirroring apps/web/src/app/globals.css
extension Color {
    static let brandPrimary = Color(red: 0x25 / 255, green: 0x63 / 255, blue: 0xEB / 255)
    static let brandSuccess = Color(red: 0x16 / 255, green: 0xA3 / 255, blue: 0x4A / 255)
    static let brandWarning = Color(red: 0xF5 / 255, green: 0x9E / 255, blue: 0x0B / 255)
    static let brandDanger = Color(red: 0xDC / 255, green: 0x26 / 255, blue: 0x26 / 255)
    static let brandMuted = Color(red: 0x64 / 255, green: 0x74 / 255, blue: 0x8B / 255)

    static func forStatus(_ status: String) -> Color {
        switch status {
        case "active": return .brandSuccess
        case "new": return .brandPrimary
        case "review": return .brandWarning
        case "complete": return Color(.systemGray3)
        default: return Color(.systemGray3)
        }
    }
}
