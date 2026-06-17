"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderOpen, Image, CheckSquare, Users, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Project, ProjectListResponse } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState({ projects: 0, media: 0, tasks: 0, team: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projectRes, membersRes] = await Promise.all([
          api.get<ProjectListResponse>("/projects?page_size=5"),
          api.get<{ id: string }[]>("/companies/current/members"),
        ]);
        setProjects(projectRes.items);
        const totalMedia = projectRes.items.reduce((sum, p) => sum + p.media_count, 0);
        setStats({
          projects: projectRes.total,
          media: totalMedia,
          tasks: 0,
          team: membersRes.length,
        });
      } catch {
        // API not running
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statCards = [
    { label: "Projects", value: stats.projects, icon: FolderOpen, color: "bg-blue-50 text-blue-600", href: "/projects" },
    { label: "Media", value: stats.media, icon: Image, color: "bg-emerald-50 text-emerald-600", href: "/media" },
    { label: "Open Tasks", value: stats.tasks, icon: CheckSquare, color: "bg-amber-50 text-amber-600", href: "/tasks" },
    { label: "Team", value: stats.team, icon: Users, color: "bg-purple-50 text-purple-600", href: "/team" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Welcome back to fieldcam.app</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{stat.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{loading ? "—" : stat.value}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Projects</h2>
          <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-sm text-slate-400">No projects yet.</p>
            <Link href="/projects/new" className="inline-block mt-3 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Create Project
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition">
                <div>
                  <p className="text-sm font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {[project.city, project.state].filter(Boolean).join(", ")}
                    {project.claim_number && ` — ${project.claim_number}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                  </span>
                  <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                    project.status === "active" ? "bg-green-50 text-green-600" :
                    project.status === "new" ? "bg-blue-50 text-blue-600" :
                    project.status === "review" ? "bg-amber-50 text-amber-600" :
                    "bg-slate-100 text-slate-500"
                  }`}>{project.status}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
