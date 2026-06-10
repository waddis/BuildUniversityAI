import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authVM: AuthViewModel

    var body: some View {
        TabView {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "square.grid.2x2")
                }

            ProjectListView()
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }

            CaptureView()
                .tabItem {
                    Label("Capture", systemImage: "camera.fill")
                }

            TaskListView()
                .tabItem {
                    Label("Tasks", systemImage: "checkmark.circle")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
        .environmentObject(authVM)
    }
}
