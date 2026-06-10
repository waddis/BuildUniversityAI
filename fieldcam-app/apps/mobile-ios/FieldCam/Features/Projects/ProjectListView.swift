import SwiftUI

struct ProjectListView: View {
    @StateObject private var vm = ProjectsViewModel()
    @State private var showCreate = false

    private let statusFilters: [(value: String?, label: String)] = [
        (nil, "All"),
        ("new", "New"),
        ("active", "Active"),
        ("review", "Review"),
        ("complete", "Complete"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(statusFilters, id: \.label) { filter in
                            Button {
                                withAnimation(.easeInOut(duration: 0.15)) {
                                    vm.statusFilter = filter.value
                                }
                            } label: {
                                Text(filter.label)
                                    .font(.system(size: 13, weight: .medium))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 7)
                                    .background(vm.statusFilter == filter.value ? Color.brandPrimary.opacity(0.1) : Color(.systemGray6))
                                    .foregroundStyle(vm.statusFilter == filter.value ? Color.brandPrimary : Color.secondary)
                                    .clipShape(Capsule())
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 4)
                }

                LazyVStack(spacing: 10) {
                    if vm.isLoading && vm.projects.isEmpty {
                        ForEach(0..<3, id: \.self) { _ in ShimmerCard() }
                    } else if vm.filteredProjects.isEmpty {
                        emptyState
                    } else {
                        ForEach(vm.filteredProjects) { project in
                            NavigationLink(destination: ProjectDetailView(project: project)) {
                                ProjectCard(project: project)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.top, 6)
                .padding(.bottom, 20)
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Projects")
            .searchable(text: $vm.searchText, prompt: "Search by name, address, claim...")
            .refreshable { await vm.fetchProjects() }
            .task { await vm.fetchProjects() }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showCreate = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .symbolRenderingMode(.hierarchical)
                    }
                }
            }
            .sheet(isPresented: $showCreate) {
                CreateProjectView { _ in Task { await vm.fetchProjects() } }
            }
        }
    }

    private var isFiltering: Bool {
        !vm.searchText.isEmpty || vm.statusFilter != nil
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "folder.badge.plus")
                .font(.system(size: 44))
                .foregroundStyle(Color.brandPrimary.opacity(0.3))
            Text(isFiltering ? "No Results" : "No Projects Yet")
                .font(.title3.bold())
                .foregroundStyle(.primary)
            Text(isFiltering ? "Try a different search or filter." : "Create your first project to start\ndocumenting field work.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            if !isFiltering {
                Button { showCreate = true } label: {
                    Text("New Project")
                        .font(.system(size: 15, weight: .semibold))
                        .padding(.horizontal, 24)
                        .padding(.vertical, 10)
                        .background(Color.brandPrimary)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                }
            }
        }
        .padding(.top, 60)
    }
}

// MARK: - Project Card

struct ProjectCard: View {
    let project: Project

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top section
            HStack(alignment: .top, spacing: 12) {
                // Color accent
                RoundedRectangle(cornerRadius: 4)
                    .fill(statusGradient)
                    .frame(width: 4, height: 44)

                VStack(alignment: .leading, spacing: 4) {
                    Text(project.name)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)

                    if !project.displayAddress.isEmpty {
                        HStack(spacing: 4) {
                            Image(systemName: "mappin")
                                .font(.system(size: 9, weight: .medium))
                            Text(project.displayAddress)
                                .font(.system(size: 12))
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                Spacer(minLength: 4)

                StatusPill(status: project.status)
            }
            .padding(.horizontal, 14)
            .padding(.top, 14)
            .padding(.bottom, 10)

            // Bottom metadata
            HStack(spacing: 14) {
                if let claim = project.claim_number, !claim.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "doc.text").font(.system(size: 10))
                        Text(claim).font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(Color.brandPrimary.opacity(0.7))
                }
                if let count = project.media_count, count > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "photo").font(.system(size: 10))
                        Text("\(count)").font(.system(size: 11, weight: .medium))
                    }
                    .foregroundStyle(.secondary)
                }
                if let customer = project.customer_name, !customer.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "person").font(.system(size: 10))
                        Text(customer).font(.system(size: 11)).lineLimit(1)
                    }
                    .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(.quaternary)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color(.systemGray6).opacity(0.5))
        }
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .shadow(color: .black.opacity(0.05), radius: 10, y: 3)
    }

    private var statusGradient: LinearGradient {
        let c = statusColor
        return LinearGradient(colors: [c, c.opacity(0.6)], startPoint: .top, endPoint: .bottom)
    }

    private var statusColor: Color {
        Color.forStatus(project.status)
    }
}

struct StatusPill: View {
    let status: String
    var body: some View {
        Text(status.capitalized)
            .font(.system(size: 11, weight: .semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.1))
            .foregroundStyle(color)
            .clipShape(Capsule())
    }
    private var color: Color {
        Color.forStatus(status)
    }
}

struct ShimmerCard: View {
    @State private var shimmer = false
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 12) {
                RoundedRectangle(cornerRadius: 4).fill(.gray.opacity(0.12)).frame(width: 4, height: 36)
                VStack(alignment: .leading, spacing: 6) {
                    RoundedRectangle(cornerRadius: 4).fill(.gray.opacity(0.12)).frame(height: 14).frame(maxWidth: 200)
                    RoundedRectangle(cornerRadius: 4).fill(.gray.opacity(0.08)).frame(height: 10).frame(maxWidth: 150)
                }
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .opacity(shimmer ? 0.5 : 1)
        .onAppear { withAnimation(.easeInOut(duration: 1).repeatForever(autoreverses: true)) { shimmer = true } }
    }
}
