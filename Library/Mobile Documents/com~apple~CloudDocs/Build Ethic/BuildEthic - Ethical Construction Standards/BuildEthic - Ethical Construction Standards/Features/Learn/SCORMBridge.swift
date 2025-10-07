import Foundation
import WebKit

final class SCORMBridge: NSObject, WKNavigationDelegate {
    static let shared = SCORMBridge()
    private override init() {}

    // Simple in-memory CMI data store per launch
    private var cmi: [String: String] = [:]

    func handleSCORMMessage(_ msg: SCORMMessage) {
        switch msg.command {
        case .initialize:
            // Initialize CMI for a new session
            cmi = [
                "cmi.core.lesson_status": "not attempted",
                "cmi.core.score.raw": "0"
            ]
        case .getValue:
            // Respond via JS bridge callback if needed (omitted: we use synchronous return in JS)
            break
        case .setValue:
            if let k = msg.key, let v = msg.value { cmi[k] = v }
        case .commit:
            // Persist snapshot (optionally post partial progress)
            break
        case .finish:
            // Prepare xAPI completion if needed
            break
        }
    }
}
