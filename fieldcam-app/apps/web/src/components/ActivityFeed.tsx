"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { Camera, FileText, MessageSquare, CheckSquare, FolderOpen, Users } from "lucide-react";

type ActivityEvent = {
  id: string;
  event_type: string;
  entity_type: string;
  actor_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const eventIcons: Record<string, typeof Camera> = {
  "media": Camera,
  "note": FileText,
  "comment": MessageSquare,
  "task": CheckSquare,
  "project": FolderOpen,
  "membership": Users,
};

function eventLabel(event: ActivityEvent): string {
  const actor = event.actor_name || "Someone";
  switch (event.event_type) {
    case "media.uploaded": return `${actor} uploaded a photo`;
    case "media.deleted": return `${actor} deleted a photo`;
    case "note.created": return `${actor} added a note`;
    case "comment.created": return `${actor} left a comment`;
    case "task.created": return `${actor} created a task`;
    case "task.updated": return `${actor} updated a task`;
    case "project.created": return `${actor} created this project`;
    case "project.updated": return `${actor} updated project details`;
    case "project.archived": return `${actor} archived this project`;
    default: return `${actor} performed ${event.event_type}`;
  }
}

export default function ActivityFeed({ projectId }: { projectId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<ActivityEvent[]>(`/search/activity?project_id=${projectId}`);
        setEvents(data);
      } catch {
        // Activity endpoint may not be implemented yet
      }
      setLoading(false);
    }
    load();
  }, [projectId]);

  if (loading) return <p className="text-sm text-slate-400">Loading activity...</p>;

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-8">
        Activity will appear here as you work on this project.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const Icon = eventIcons[event.entity_type] || FolderOpen;
        return (
          <div key={event.id} className="flex items-start gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-700">{eventLabel(event)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
