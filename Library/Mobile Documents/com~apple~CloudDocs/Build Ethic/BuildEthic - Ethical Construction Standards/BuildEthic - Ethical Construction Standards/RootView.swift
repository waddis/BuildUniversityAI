import SwiftUI

struct RootView: View {
    @EnvironmentObject var session: AuthSession
    
    var body: some View {
        Group {
            #if DEBUG
            // Skip authentication in development
            HomeView()
            #else
            switch session.state {
            case .unknown:
                // Show loading or onboa