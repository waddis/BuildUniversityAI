//
//  ContentView.swift
//  BuildEthic - Ethical Construction Standards
//
//  Created by William Addis on 10/6/25.
//

import SwiftUI

struct ContentView: View {
    var body: some View {
        VStack {
            Image(systemName: "hammer.fill")
                .imageScale(.large)
                .foregroundStyle(.tint)
            Text("Resolution Academy")
                .font(.title)
                .fontWeight(.bold)
            Text("Professional Development Platform")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Text("(This is a preview - the main app uses RootView)")
                .font(.caption)
                .foregroundColor(.red)
                .padding(.top)
        }
        .padding()
    }
}

#Preview {
    ContentView()
}
