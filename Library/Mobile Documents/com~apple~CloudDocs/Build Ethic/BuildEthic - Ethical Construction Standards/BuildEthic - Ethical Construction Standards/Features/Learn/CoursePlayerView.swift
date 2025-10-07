import SwiftUI

struct CoursePlayerView: View {
    @State private var launch: SCORMLaunchToken?
    @State private var show3DModel = false
    @State private var selectedModel: RoofModelType = .standard
    let courseId: String
    
    enum RoofModelType: CaseIterable {
        case standard, truePitch, gableV3
        
        var title: String {
            switch self {
            case .standard: return "Standard"
            case .truePitch: return "True Pitch"
            case .gableV3: return "Gable V3"
            }
        }
        
        var description: String {
            switch self {
            case .standard: return "Basic roof model"
            case .truePitch: return "Accurate pitch geometry"
            case .gableV3: return "Advanced with fascia"
            }
        }
    }

    var body: some View {
        Group {
            if let launch { 
                SCORMWebView(launch: launch, on3DModel: {
                    show3DModel = true
                }) 
            } else { 
                VStack {
                    ProgressView("Preparing course…")
                    Text("Loading SCORM content...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.top)
                }
            }
        }
        .task {
            await prepareLaunch()
        }
        .navigationTitle("Course Player")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $show3DModel) {
            NavigationStack {
                VStack {
                    // Model selection
                    Picker("Roof Model", selection: $selectedModel) {
                        ForEach(RoofModelType.allCases, id: \.self) { model in
                            VStack(alignment: .leading) {
                                Text(model.title)
                                    .font(.headline)
                                Text(model.description)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .tag(model)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)
                    
                    // 3D Model View
                    Group {
                        switch selectedModel {
                        case .standard:
                            Roof3DView()
                        case .truePitch:
                            Roof3DTruePitchView(pitchRisePer12: 6)
                        case .gableV3:
                            Roof3DGableV3View(pitchRisePer12: 6)
                        }
                    }
                }
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("Done") {
                            show3DModel = false
                        }
                    }
                }
            }
        }
    }

    private func prepareLaunch() async {
        do {
            #if DEBUG
            // Use mock service in development
            let mockToken = try await MockSCORMService.shared.launchCourse(courseId: courseId)
            PlayerSession.shared.currentLaunch = mockToken
            await MainActor.run {
                self.launch = mockToken
            }
            #else
            // Use real API in production
            let token = try await APIClient.shared.requestSCORMLaunch(courseId: courseId)
            PlayerSession.shared.currentLaunch = token
            await MainActor.run {
                self.launch = token
            }
            #endif
        } catch {
            print("Launch error: \(error)")
        }
    }
}
