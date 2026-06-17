"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Membership } from "@/lib/types";
import { UserPlus, Shield } from "lucide-react";

export default function TeamPage() {
  const [members, setMembers] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("field_user");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Membership[]>("/companies/current/members");
        setMembers(data);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await api.post("/companies/current/invite", { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      // Refresh
      const data = await api.get<Membership[]>("/companies/current/members");
      setMembers(data);
    } catch {}
    setInviting(false);
  };

  const roleColors: Record<string, string> = {
    owner: "bg-purple-50 text-purple-600",
    admin: "bg-blue-50 text-blue-600",
    manager: "bg-green-50 text-green-600",
    field_user: "bg-slate-100 text-slate-600",
    viewer: "bg-slate-50 text-slate-400",
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Invite form */}
      <form onSubmit={handleInvite} className="mt-6 flex gap-3">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="Email address"
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={inviteRole}
          onChange={(e) => setInviteRole(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm"
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="field_user">Field User</option>
          <option value="viewer">Viewer</option>
        </select>
        <button type="submit" disabled={inviting || !inviteEmail}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
          <UserPlus className="w-4 h-4" />
          Invite
        </button>
      </form>

      {/* Member list */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Loading...</div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-xs font-medium text-blue-600">
                    {m.user?.full_name ? m.user.full_name.split(" ").map(n => n[0]).join("").toUpperCase() : m.user?.email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {m.user?.full_name || m.user?.email}
                  </p>
                  <p className="text-xs text-slate-500">{m.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {m.status === "invited" && (
                  <span className="text-xs text-amber-500">Invited</span>
                )}
                <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${roleColors[m.role] || "bg-slate-100 text-slate-500"}`}>
                  {m.role.replace("_", " ")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
