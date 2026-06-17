import SwiftUI

struct ProjectDetailView: View {
    let project: Project
    @State private var selectedTab = 0
    @State private var showCamera = false
    @State private var showPhotoPicker = false
    @State private var refreshID = UUID()

    var body: some View {
        VStack(spacing: 0) {
            // Info header
            VStack(spacing: 12) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 4) {
                        if !project.displayAddress.isEmpty {
                            HStack(spacing: 5) {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundStyle(Color.brandPrimary)
                                    .font(.system(size: 14))
                                Text(project.displayAddress)
                                    .font(.system(size: 13))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    Spacer()
                    StatusPill(status: project.status)
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        if let claim = project.claim_number, !claim.isEmpty {
                            InfoChip(icon: "doc.text", text: claim, color: .brandPrimary)
                        }
                        if let count = project.media_count, count > 0 {
                            InfoChip(icon: "photo", text: "\(count) photos", color: .brandSuccess)
                        }
                        if let customer = project.customer_name, !customer.isEmpty {
                            InfoChip(icon: "person", text: customer, color: .purple)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(.white)

            Picker("Tab", selection: $selectedTab) {
                Text("Gallery").tag(0)
                Text("Timeline").tag(1)
                Text("Tasks").tag(2)
                Text("Notes").tag(3)
                Text("Reports").tag(4)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(.systemGroupedBackground))

            Group {
                switch selectedTab {
                case 0: GalleryView(projectId: project.id).id(refreshID)
                case 1: ActivityFeedView(projectId: project.id)
                case 2: TaskListView(projectId: project.id)
                case 3: NotesView(projectId: project.id)
                case 4: ReportsView(projectId: project.id)
                default: Spacer()
                }
            }
            .frame(maxHeight: .infinity)
            .background(Color(.systemGroupedBackground))
        }
        .navigationTitle(project.name)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button { showCamera = true } label: {
                        Label("Take Photo", systemImage: "camera")
                    }
                    Button { showPhotoPicker = true } label: {
                        Label("Choose from Library", systemImage: "photo.on.rectangle")
                    }
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .symbolRenderingMode(.hierarchical)
                        .font(.title3)
                }
            }
        }
        .fullScreenCover(isPresented: $showCamera, onDismiss: { refreshID = UUID() }) {
            FieldCameraView(projectId: project.id)
        }
        .sheet(isPresented: $showPhotoPicker, onDismiss: { refreshID = UUID() }) {
            PhotoPickerView(projectId: project.id)
        }
    }
}

struct InfoChip: View {
    let icon: String
    let text: String
    let color: Color

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon).font(.system(size: 10))
            Text(text).font(.system(size: 11, weight: .medium))
        }
        .foregroundStyle(color)
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(color.opacity(0.08))
        .clipShape(Capsule())
    }
}
