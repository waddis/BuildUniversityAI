import SwiftUI

struct NotesView: View {
    let projectId: String
    @State private var notes: [NoteService.NoteResponse] = []
    @State private var newNote = ""
    @State private var isLoading = true
    @State private var isSending = false

    var body: some View {
        VStack(spacing: 0) {
            if isLoading {
                ProgressView()
                    .frame(maxHeight: .infinity)
            } else if notes.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "note.text")
                        .font(.system(size: 36))
                        .foregroundStyle(Color.brandPrimary.opacity(0.3))
                    Text("No notes yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("Add observations and findings below.")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                .frame(maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(notes) { note in
                            NoteCard(note: note, onDelete: {
                                Task {
                                    try? await NoteService.delete(id: note.id)
                                    await fetchNotes()
                                }
                            })
                        }
                    }
                    .padding(.horizontal, 12)
                    .padding(.top, 8)
                    .padding(.bottom, 80) // space for compose bar
                }
            }

            // Compose bar
            VStack(spacing: 0) {
                Divider()
                HStack(spacing: 10) {
                    TextField("Write a note...", text: $newNote, axis: .vertical)
                        .font(.system(size: 15))
                        .lineLimit(1...4)
                        .textFieldStyle(.plain)

                    Button(action: sendNote) {
                        Group {
                            if isSending {
                                ProgressView().controlSize(.small)
                            } else {
                                Image(systemName: "arrow.up.circle.fill")
                                    .font(.system(size: 28))
                                    .symbolRenderingMode(.hierarchical)
                            }
                        }
                        .foregroundStyle(canSend ? Color.brandPrimary : Color(.systemGray4))
                    }
                    .disabled(!canSend)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .background(.ultraThinMaterial)
        }
        .task { await fetchNotes() }
    }

    private var canSend: Bool {
        !newNote.trimmingCharacters(in: .whitespaces).isEmpty && !isSending
    }

    private func fetchNotes() async {
        do { notes = try await NoteService.fetchForProject(id: projectId) } catch {}
        isLoading = false
    }

    private func sendNote() {
        let text = newNote.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        isSending = true
        Task {
            _ = try? await NoteService.create(projectId: projectId, body: text)
            newNote = ""
            await fetchNotes()
            isSending = false
        }
    }
}

struct NoteCard: View {
    let note: NoteService.NoteResponse
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(note.body)
                .font(.system(size: 14))
                .foregroundStyle(.primary)
                .fixedSize(horizontal: false, vertical: true)

            HStack {
                HStack(spacing: 4) {
                    Image(systemName: "person.circle")
                        .font(.system(size: 11))
                    Text(note.author_name ?? "Unknown")
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundStyle(.secondary)

                Text("·")
                    .foregroundStyle(.quaternary)

                Text(formatNoteDate(note.created_at))
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)

                Spacer()

                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 12))
                        .foregroundStyle(.quaternary)
                }
            }
        }
        .padding(14)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .shadow(color: .black.opacity(0.03), radius: 6, y: 2)
    }

    private func formatNoteDate(_ iso: String) -> String {
        let clean = String(iso.prefix(19))
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate, .withTime, .withDashSeparatorInDate, .withColonSeparatorInTime]
        if let date = f.date(from: clean) {
            let df = RelativeDateTimeFormatter()
            df.unitsStyle = .abbreviated
            return df.localizedString(for: date, relativeTo: Date())
        }
        return String(iso.prefix(10))
    }
}
