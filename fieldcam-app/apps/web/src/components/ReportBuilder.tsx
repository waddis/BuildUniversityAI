"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import type { MediaItem, MediaListResponse } from "@/lib/types";
import { FileText, Download, Plus, Loader2, Check, GripVertical } from "lucide-react";

type Report = {
  id: string;
  title: string;
  status: string;
  download_url: string | null;
  items: { id: string; media_id: string | null; note_text: string | null; thumbnail_url: string | null }[];
  created_at: string;
};

export default function ReportBuilder({ projectId }: { projectId: string }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [r, m] = await Promise.all([
          api.get<Report[]>(`/reports/projects/${projectId}`),
          api.get<MediaListResponse>(`/media/projects/${projectId}`).catch(() => ({ items: [] })),
        ]);
        setReports(r);
        setMedia(m.items);
      } catch {}
      setLoading(false);
    }
    load();
  }, [projectId]);

  const toggleMedia = (id: string) => {
    const next = new Set(selectedMedia);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedMedia(next);
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const report = await api.post<Report>(`/reports/projects/${projectId}`, {
        title,
        media_ids: Array.from(selectedMedia),
      });
      setReports([report, ...reports]);
      setShowCreate(false);
      setTitle("");
      setSelectedMedia(new Set());
    } catch {}
    setCreating(false);
  };

  const handleGenerate = async (reportId: string) => {
    try {
      await api.post(`/reports/${reportId}/generate`);
      // Refresh
      const updated = await api.get<Report[]>(`/reports/projects/${projectId}`);
      setReports(updated);
    } catch {}
  };

  if (loading) return <p className="text-sm text-slate-400">Loading reports...</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">{reports.length} report{reports.length !== 1 ? "s" : ""}</span>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Report title..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

          <div>
            <p className="text-sm font-medium text-slate-700 mb-2">Select photos ({selectedMedia.size})</p>
            <div className="grid grid-cols-6 gap-1.5 max-h-48 overflow-auto">
              {media.map((item) => (
                <button key={item.id} onClick={() => toggleMedia(item.id)}
                  className={`aspect-square rounded-md overflow-hidden relative border-2 transition ${
                    selectedMedia.has(item.id) ? "border-blue-500" : "border-transparent"
                  }`}>
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.room_label ? `Photo of ${item.room_label}` : 'Field photo'} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  {selectedMedia.has(item.id) && (
                    <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={!title.trim() || creating}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {creating ? "Creating..." : "Create Report"}
            </button>
            <button onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Report list */}
      {reports.length === 0 && !showCreate ? (
        <p className="text-sm text-slate-400 text-center py-8">No reports yet. Create one to get started.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border border-slate-200 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{report.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {report.items.length} items &middot; {report.status}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {report.status === "draft" && (
                  <button onClick={() => handleGenerate(report.id)}
                    className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                    Generate PDF
                  </button>
                )}
                {report.status === "generating" && (
                  <span className="flex items-center gap-1 text-xs text-amber-500">
                    <Loader2 className="w-3 h-3 animate-spin" /> Generating...
                  </span>
                )}
                {report.status === "ready" && report.download_url && (
                  <a href={report.download_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100">
                    <Download className="w-3 h-3" /> Download PDF
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
