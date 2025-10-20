import SwiftUI

struct ContentView: View {
    var body: some View {
        TabView {
            LearnView()
                .tabItem { Label("Learn", systemImage: "book.closed") }
            ExploreView()
                .tabItem { Label("Explore", systemImage: "safari") }
            LibraryView()
                .tabItem { Label("Library", systemImage: "books.vertical") }
            CodesView()
                .tabItem { Label("Codes", systemImage: "list.bullet.rectangle") }
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.crop.circle") }
        }
    }
}

#Preview {
    ContentView()
}