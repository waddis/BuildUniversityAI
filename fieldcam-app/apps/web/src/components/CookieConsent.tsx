"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("fieldcam_cookie_consent")) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[999] p-4" role="alert" aria-live="polite">
      <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-lg p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <p className="text-sm text-slate-600 flex-1">
          We use essential cookies and local storage to keep you signed in.
          See our{" "}
          <Link href="/privacy" className="text-blue-600 underline hover:text-blue-700">
            Privacy Policy
          </Link>{" "}
          for details on how we handle your data, including photos and location information.
        </p>
        <button
          onClick={() => {
            localStorage.setItem("fieldcam_cookie_consent", "accepted");
            setVisible(false);
          }}
          className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shrink-0"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
