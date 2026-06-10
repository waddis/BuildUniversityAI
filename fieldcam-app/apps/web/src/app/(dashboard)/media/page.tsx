"use client";

import { Image as ImageIcon } from "lucide-react";

export default function MediaLibraryPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Media Library</h1>
      <p className="mt-1 text-sm text-slate-500">All media across your projects</p>

      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-12 text-center">
        <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-400">
          Browse all photos and videos across your projects. Upload media from the mobile app or project gallery.
        </p>
      </div>
    </div>
  );
}
