import SwiftUI

@main
struct FieldCamApp: App {
    @StateObject private var authVM = AuthViewModel()

    init() {
        // Initialize sync monitor on launch
        _ = SyncMonitor.shared
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authVM)
        }
    }
}
