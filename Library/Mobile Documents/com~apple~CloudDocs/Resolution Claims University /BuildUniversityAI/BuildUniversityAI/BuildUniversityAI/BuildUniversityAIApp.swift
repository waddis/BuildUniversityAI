import SwiftUI

@main
struct BuildUniversityAIApp: App {
    init() {
        // Configure shared URL cache to enable HTTP caching of remote resources
        URLCache.shared = URLCache(
            memoryCapacity: 50 * 1024 * 1024,
            diskCapacity: 200 * 1024 * 1024,
            directory: nil
        )
    }
    var body: some Scene {
        WindowGroup {
            NavigationStack {        // <— wrap your root here
                ContentView()
            }
        }
    }
}