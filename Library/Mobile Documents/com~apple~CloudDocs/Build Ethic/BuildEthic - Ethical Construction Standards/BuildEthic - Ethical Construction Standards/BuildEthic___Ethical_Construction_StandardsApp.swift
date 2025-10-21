import SwiftUI

@main
struct ResolutionAcademyApp: App {
    @StateObject private var session = AuthSession()
    let persistence = PersistenceController.shared

    init() {
        // Seed data loading disabled for now
        print("Resolution Academy app starting...")
        // Configure shared URL cache for better network re-use
        URLCache.shared = URLCache(
            memoryCapacity: 50 * 1024 * 1024,
            diskCapacity: 200 * 1024 * 1024,
            directory: nil
        )
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(\.managedObjectContext, persistence.container.viewContext)
                .environmentObject(session)
                .task { await SyncService.shared.bootstrap(session: session) }
        }
    }
}