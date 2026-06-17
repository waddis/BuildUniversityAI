"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { Plus, Circle, CheckCircle2 } from "lucide-react";

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_name: string | null;
  due_at: string | null;
  required_photo: boolean;
};

export default function ProjectTasks({ projectId }: { projectId: string }) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");

  const fetchTasks = async () => {
    try {
      const data = await api.get<{ items: TaskItem[] }>(`/tasks/projects/${projectId}`);
      setTasks(data.items);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, [projectId]);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await api.post(`/tasks/projects/${projectId}`, { title: newTitle, priority: newPriority });
      setNewTitle("");
      setShowCreate(false);
      await fetchTasks();
    } catch {}
  };

  const toggleTask = async (task: TaskItem) => {
    const newStatus = task.status === "done" ? "open" : "done";
    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
      await fetchTasks();
    } catch {}
  };

  const priorityColors: Record<string, string> = {
    high: "text-red-500",
    medium: "text-amber-500",
    low: "text-slate-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-slate-500">{tasks.filter(t => t.status !== "done").length} open</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {showCreate && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Task title..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value)}
            className="px-2 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button onClick={handleCreate} disabled={!newTitle.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
            Add
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No tasks yet.</p>
      ) : (
        <div className="space-y-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition"
            >
              <button onClick={() => toggleTask(task)}>
                {task.status === "done" ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${task.status === "done" ? "line-through text-slate-400" : "text-slate-800"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs ${priorityColors[task.priority] || "text-slate-400"}`}>
                    {task.priority}
                  </span>
                  {task.assignee_name && (
                    <span className="text-xs text-slate-400">{task.assignee_name}</span>
                  )}
                  {task.required_photo && (
                    <span className="text-xs text-blue-400">photo required</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
