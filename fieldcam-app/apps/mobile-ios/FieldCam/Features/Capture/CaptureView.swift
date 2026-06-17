import SwiftUI
import CoreLocation

struct CaptureView: View {
    var preselectedProjectId: String? = nil
    @State private var showCamera = false
    @State private var selectedProjectId: String?
    @StateObject private var projectsVM = ProjectsViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                Color(.systemGroupedBackground).ignoresSafeArea()

                VStack(spacing: 28) {
                    Spacer()

                    // Camera icon with pulsing ring
                    ZStack {
                        Circle()
                            .fill(Color.brandPrimary.opacity(0.06))
                            .frame(width: 130, height: 130)
                        Circle()
                            .fill(Color.brandPrimary.opacity(0.1))
                            .frame(width: 100, height: 100)
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 42, weight: .medium))
                            .foregroundStyle(Color.brandPrimary)
                    }

                    VStack(spacing: 8) {
                        Text("Quick Capture")
                            .font(.title2.bold())
                        Text("Photos & videos with GPS, timestamps,\nand metadata — saved automatically.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }

                    // Project selector
                    if !projectsVM.projects.isEmpty {
                        Menu {
                            ForEach(projectsVM.projects) { project in
                                Button {
                                    selectedProjectId = project.id
                                } label: {
                                    Label(project.name, systemImage: "folder")
                                }
                            }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: "folder.fill")
                                    .font(.system(size: 12))
                                Text(selectedProjectName)
                                    .font(.system(size: 14, weight: .medium))
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.system(size: 10))
                            }
                            .foregroundStyle(Color.brandPrimary)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 10)
                            .background(Color.brandPrimary.opacity(0.08))
                            .clipShape(Capsule())
                        }
                    }

                    // Camera button
                    Button {
                        showCamera = true
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "camera.fill")
                                .font(.system(size: 16))
                            Text("Open Camera")
                                .font(.system(size: 16, weight: .semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(
                            LinearGradient(colors: [Color.brandPrimary, Color.brandPrimary.opacity(0.85)], startPoint: .leading, endPoint: .trailing)
                        )
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .padding(.horizontal, 40)

                    Spacer()
                }
            }
            .navigationTitle("Capture")
            .task {
                await projectsVM.fetchProjects()
                selectedProjectId = preselectedProjectId ?? projectsVM.projects.first?.id
            }
            .fullScreenCover(isPresented: $showCamera) {
                FieldCameraView(projectId: selectedProjectId)
            }
        }
    }

    private var selectedProjectName: String {
        if let id = selectedProjectId,
           let project = projectsVM.projects.first(where: { $0.id == id }) {
            return project.name
        }
        return "Select Project"
    }
}
