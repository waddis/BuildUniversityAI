import SwiftUI

struct TaskListView: View {
    var projectId: String?
    @State private var tasks: [FieldTask] = []
    @State private var isLoading = true
    @State private var newTitle = ""
    @StateObject private var projectsVM = ProjectsViewModel()

    var body: some View {
        if let projectId {
            embeddedTaskView(projectId: projectId)
        } else {
            standaloneTaskView
        }
    }

    // MARK: - Standalone (Tab)

    private var standaloneTaskView: some View {
        NavigationStack {
            Group {
                if isLoading && tasks.isEmpty {
                    ProgressView()
                        .frame(maxHeight: .infinity)
                } else if tasks.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "checkmark.circle")
                            .font(.system(size: 44))
                            .foregroundStyle(Color.brandSuccess.opacity(0.3))
                        Text("All Clear")
                            .font(.title3.bold())
                        Text("No open tasks across your projects.")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxHeight: .infinity)
                } else {
                    List {
                        ForEach(tasks) { task in
                            TaskRow(task: task, onToggle: { toggleTask(task) })
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("Tasks")
            .refreshable { await fetchAllTasks() }
            .task { await fetchAllTasks() }
        }
    }

    // MARK: - Embedded (Project Detail)

    private func embeddedTaskView(projectId: String) -> some View {
        VStack(spacing: 0) {
            // Create bar
            HStack(spacing: 10) {
                Image(systemName: "plus.circle")
                    .foregroundStyle(Color.brandPrimary)
                    .font(.system(size: 18))
                TextField("Add a task...", text: $newTitle)
                    .font(.system(size: 15))
                    .onSubmit { createTask(projectId: projectId) }
                if !newTitle.trimmingCharacters(in: .whitespaces).isEmpty {
                    Button {
                        createTask(projectId: projectId)
                    } label: {
                        Text("Add")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(Color.brandPrimary)
                            .clipShape(Capsule())
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.white)

            Divider()

            if isLoading {
                ProgressView()
                    .frame(maxHeight: .infinity)
            } else if tasks.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 36))
                        .foregroundStyle(Color.brandSuccess.opacity(0.3))
                    Text("No tasks yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(tasks) { task in
                            TaskRow(task: task, onToggle: { toggleTask(task) })
                            Divider().padding(.leading, 52)
                        }
                    }
                    .background(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
                }
            }
        }
        .task { await fetchTasks(projectId: projectId) }
    }

    // MARK: - Data

    private func fetchTasks(projectId: String) async {
        do {
            tasks = try await TaskService.fetchForProject(id: projectId)
        } catch {}
        isLoading = false
    }

    private func fetchAllTasks() async {
        await projectsVM.fetchProjects()
        var allTasks: [FieldTask] = []
        for project in projectsVM.projects {
            if let projectTasks = try? await TaskService.fetchForProject(id: project.id) {
                allTasks.append(contentsOf: projectTasks)
            }
        }
        tasks = allTasks.sorted { ($0.status == "done" ? 1 : 0) < ($1.status == "done" ? 1 : 0) }
        isLoading = false
    }

    private func createTask(projectId: String) {
        let title = newTitle.trimmingCharacters(in: .whitespaces)
        guard !title.isEmpty else { return }
        Task {
            _ = try? await TaskService.create(projectId: projectId, title: title)
            newTitle = ""
            await fetchTasks(projectId: projectId)
        }
    }

    private func toggleTask(_ task: FieldTask) {
        let newStatus = task.isDone ? "open" : "done"
        Task {
            _ = try? await TaskService.update(id: task.id, status: newStatus)
            if let pid = projectId {
                await fetchTasks(projectId: pid)
            } else {
                await fetchAllTasks()
            }
        }
    }
}

// MARK: - Task Row

struct TaskRow: View {
    let task: FieldTask
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button(action: onToggle) {
                Image(systemName: task.isDone ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 22))
                    .foregroundStyle(task.isDone ? Color.brandSuccess : Color(.systemGray3))
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 3) {
                Text(task.title)
                    .font(.system(size: 15, weight: task.isDone ? .regular : .medium))
                    .foregroundStyle(task.isDone ? .secondary : .primary)
                    .strikethrough(task.isDone, color: .secondary)

                if let desc = task.description, !desc.isEmpty {
                    Text(desc)
                        .font(.system(size: 12))
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text(task.priority.capitalized)
                    .font(.system(size: 10, weight: .semibold))
                    .padding(.horizontal, 7)
                    .padding(.vertical, 2)
                    .background(priorityColor.opacity(0.1))
                    .foregroundStyle(priorityColor)
                    .clipShape(Capsule())

                if task.isDone {
                    Image(systemName: "checkmark")
                        .font(.system(size: 9, weight: .bold))
                        .foregroundStyle(Color.brandSuccess)
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .contentShape(Rectangle())
    }

    private var priorityColor: Color {
        switch task.priority {
        case "high": return .brandDanger
        case "medium": return .brandWarning
        case "low": return Color(.systemGray)
        default: return Color(.systemGray)
        }
    }
}
