import SwiftUI

@main
struct ResolutionAcademyApp: App {
    @StateObject private var session = AuthSession()
    let persistence = PersistenceController.shared

    init() {
        // Seed data loading disabled for now
        print("Resolution Academy app starting...")
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