"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteAccountButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await fetch("/api/customer/delete", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-3">
        <p className="text-xs" style={{ color: "#dc2626" }}>Are you sure? This cannot be undone.</p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ backgroundColor: "#dc2626", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {deleting ? "Deleting…" : "Yes, Delete"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-60"
          style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs font-bold tracking-widest uppercase underline hover:opacity-60 transition-opacity"
      style={{ color: "#dc262666", fontFamily: "var(--font-brand), sans-serif" }}
    >
      Delete Account
    </button>
  );
}
