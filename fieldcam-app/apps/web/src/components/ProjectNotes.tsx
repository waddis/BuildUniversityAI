"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Send, Trash2 } from "lucide-react";

type Note = {
  id: string;
  author_name: string | null;
  body: string;
  created_at: string;
};

export default function ProjectNotes({ projectId }: { projectId: string }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchNotes = async () => {
    try {
      const data = await api.get<Note[]>(`/notes/projects/${projectId}`);
      setNotes(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [projectId]);

  const handleCreate = async () => {
    if (!newNote.trim()) return;
    setSending(true);
    try {
      await api.post(`/notes/projects/${projectId}`, { body: newNote });
      setNewNote("");
      await fetchNotes();
    } catch {}
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/notes/${id}`);
      await fetchNotes();
    } catch {}
  };

  return (
    <div>
      {/* Compose */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="Add a note..."
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleCreate}
          disabled={!newNote.trim() || sending}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No notes yet.</p>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 group">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.body}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {note.author_name || "Unknown"} &middot; {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
