"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, FolderOpen } from "lucide-react";
import { api } from "@/lib/api";
import type { Project, ProjectListResponse } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

const STATUS_OPTIONS = ["all", "new", "active", "review", "complete"] as const;

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), page_size: "20" });
      if (search) params.set("q", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await api.get<ProjectListResponse>(`/projects?${params}`);
      setProjects(res.items);
      setTotal(res.total);
    } catch {
      // API may not be running
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchProjects, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchProjects, search]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">{total} project{total !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Link>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                statusFilter === s
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      <div className="mt-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400">
              {search ? "No projects match your search." : "No projects yet. Create your first project to get started."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-slate-900 truncate">{project.name}</p>
                    {project.project_number && (
                      <span className="text-xs text-slate-400">{project.project_number}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {[project.address_line_1, project.city, project.state].filter(Boolean).join(", ")}
                    {project.customer_name && ` — ${project.customer_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-4 ml-4">
                  <span className="text-xs text-slate-400 hidden sm:block">
                    {project.media_count} photo{project.media_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-slate-400 hidden md:block">
                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${
                    project.status === "active" ? "bg-green-50 text-green-600" :
                    project.status === "new" ? "bg-blue-50 text-blue-600" :
                    project.status === "review" ? "bg-amber-50 text-amber-600" :
                    project.status === "complete" ? "bg-slate-100 text-slate-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>
                    {project.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-500">
              Page {page} of {Math.ceil(total / 20)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 20 >= total}
              className="px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
