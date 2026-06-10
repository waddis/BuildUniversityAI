"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Project, MediaItem, MediaListResponse } from "@/lib/types";
import { Upload, MapPin, Calendar, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import ProjectNotes from "@/components/ProjectNotes";
import ProjectTasks from "@/components/ProjectTasks";
import ActivityFeed from "@/components/ActivityFeed";
import ReportBuilder from "@/components/ReportBuilder";

const tabs = ["Gallery", "Timeline", "Tasks", "Notes", "Reports", "Team", "Settings"] as const;

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Gallery");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [p, m] = await Promise.all([
          api.get<Project>(`/projects/${id}`),
          api.get<MediaListResponse>(`/media/projects/${id}`).catch(() => ({ items: [] as MediaItem[], total: 0, page: 1, page_size: 50, has_more: false })),
        ]);
        setProject(p);
        setMedia(m.items);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="text-sm text-slate-400">Loading project...</div>;
  }

  if (!project) {
    return <div className="text-sm text-red-500">Project not found.</div>;
  }

  const address = [project.address_line_1, project.city, project.state, project.postal_code]
    .filter(Boolean)
    .join(", ");

  return (
    <div>
      <div className="flex items-center gap-4 mb-2">
        <Link href="/projects" className="text-sm text-slate-500 hover:text-slate-700">&larr; Projects</Link>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
            {address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {address}
              </span>
            )}
            {project.claim_number && (
              <span className="flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> {project.claim_number}
              </span>
            )}
            {project.loss_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Loss: {format(new Date(project.loss_date), "MMM d, yyyy")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            project.status === "active" ? "bg-green-50 text-green-600" :
            project.status === "new" ? "bg-blue-50 text-blue-600" :
            project.status === "review" ? "bg-amber-50 text-amber-600" :
            "bg-slate-100 text-slate-500"
          }`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* Info cards */}
      {(project.customer_name || project.damage_category || project.carrier_reference) && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {project.customer_name && (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">Customer</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{project.customer_name}</p>
            </div>
          )}
          {project.damage_category && (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">Damage</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{project.damage_category}</p>
            </div>
          )}
          {project.carrier_reference && (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">Carrier</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{project.carrier_reference}</p>
            </div>
          )}
          {project.inspection_type && (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs text-slate-400">Inspection</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5">{project.inspection_type}</p>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 border-b border-slate-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-3 text-sm font-medium transition border-b-2",
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}>
              {tab}
              {tab === "Gallery" && ` (${project.media_count})`}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "Gallery" && (
          <div>
            {media.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No media uploaded yet.</p>
                <p className="text-xs text-slate-300 mt-1">Upload photos from the mobile app or drag and drop here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {media.map((item) => (
                  <div key={item.id} className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group cursor-pointer">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.room_label ? `Photo of ${item.room_label}` : 'Field documentation photo'} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                    {item.room_label && (
                      <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[10px] font-medium bg-black/60 text-white rounded">
                        {item.room_label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {activeTab === "Timeline" && (
          <ActivityFeed projectId={id} />
        )}
        {activeTab === "Tasks" && (
          <ProjectTasks projectId={id} />
        )}
        {activeTab === "Notes" && (
          <ProjectNotes projectId={id} />
        )}
        {activeTab === "Reports" && (
          <ReportBuilder projectId={id} />
        )}
        {activeTab !== "Gallery" && activeTab !== "Timeline" && activeTab !== "Tasks" && activeTab !== "Notes" && activeTab !== "Reports" && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">{activeTab} content coming soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}
