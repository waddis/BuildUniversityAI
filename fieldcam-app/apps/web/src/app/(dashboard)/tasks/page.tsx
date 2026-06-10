"use client";

import { CheckSquare } from "lucide-react";

export default function TasksPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
      <p className="mt-1 text-sm text-slate-500">All tasks across your projects</p>

      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-12 text-center">
        <CheckSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">
          Tasks from all projects will appear here. Create tasks from within a project.
        </p>
      </div>
    </div>
  );
}
