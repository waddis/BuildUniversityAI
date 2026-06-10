"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Company } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.get<Company>("/companies/current");
        setCompany(data);
      } catch {}
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900">Settings</h1>

      {/* Company */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900">Company</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              defaultValue={company?.name || ""}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Slug</label>
            <p className="text-sm text-slate-500">{company?.slug}</p>
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900">Account</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
            <p className="text-sm text-slate-500">{user?.full_name || "—"}</p>
          </div>
        </div>
      </div>
      {/* Data & Privacy */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900">Data & Privacy</h2>
        <p className="mt-2 text-sm text-slate-500">
          You can request a copy of your data or delete your account. Deletion is permanent and removes all your projects, photos, and reports.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="mailto:privacy@fieldcam.app?subject=Data%20Export%20Request"
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
          >
            Request Data Export
          </a>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
          >
            Delete Account
          </button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700 font-medium mb-2">
              This will permanently delete your account and all associated data including projects, photos, and reports. This action cannot be undone.
            </p>
            <label className="block text-sm text-red-700 mb-2">
              Type <strong>DELETE</strong> to confirm:
            </label>
            <input
              type="text"
              value={deleteText}
              onChange={(e) => setDeleteText(e.target.value)}
              className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
              placeholder="DELETE"
            />
            <div className="flex gap-3">
              <button
                disabled={deleteText !== "DELETE" || deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await api.delete("/users/me");
                    logout();
                    router.push("/");
                  } catch {
                    setDeleting(false);
                    alert("Failed to delete account. Please contact privacy@fieldcam.app");
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Permanently Delete Account"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteText(""); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
