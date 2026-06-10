"use client";

import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>

      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-12 text-center">
        <Bell className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">You&apos;re all caught up. No new notifications.</p>
      </div>
    </div>
  );
}
