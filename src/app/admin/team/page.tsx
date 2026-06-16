"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface TeamMember {
  id: string;
  name: string;
  position: string;
  photoUrl: string | null;
  order: number;
  createdAt: string;
}

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#03033f99",
  fontFamily: "var(--font-brand), sans-serif",
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  backgroundColor: "#03033f",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontFamily: "var(--font-brand), sans-serif",
};

const btnGhost: React.CSSProperties = {
  padding: "9px 18px",
  backgroundColor: "transparent",
  color: "#03033f",
  border: "1px solid #03033f22",
  cursor: "pointer",
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  fontFamily: "var(--font-brand), sans-serif",
};

function blankDraft(order: number): TeamMember {
  return { id: "", name: "", position: "", photoUrl: null, order, createdAt: new Date().toISOString() };
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<"closed" | "add" | "edit">("closed");
  const [draft, setDraft] = useState<TeamMember | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/team");
    setMembers(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setDraft(blankDraft(members.length + 1));
    setDrawer("add");
    setFormError("");
    setUploadError("");
  }

  function openEdit(m: TeamMember) {
    setDraft({ ...m });
    setDrawer("edit");
    setFormError("");
    setUploadError("");
  }

  function closeDrawer() {
    setDrawer("closed");
    setDraft(null);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setUploadError("Photo must be under 4.5 MB.");
      e.target.value = "";
      return;
    }
    setUploading(true);
    setUploadError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      setUploadError("Upload failed. Please try again.");
      setUploading(false);
      return;
    }
    const { url } = await res.json();
    setDraft((d) => (d ? { ...d, photoUrl: url } : d));
    setUploading(false);
    e.target.value = "";
  }

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) { setFormError("Name is required."); return; }
    if (!draft.position.trim()) { setFormError("Position is required."); return; }
    setSaving(true);
    setFormError("");
    if (drawer === "add") {
      const id = `tm-${Date.now()}`;
      await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, id }),
      });
    } else {
      await fetch(`/api/admin/team/${draft.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
    }
    setSaving(false);
    closeDrawer();
    load();
  }

  async function del(id: string) {
    await fetch(`/api/admin/team/${id}`, { method: "DELETE" });
    setConfirmDelete(null);
    load();
  }

  const patch = (key: keyof TeamMember) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => (d ? { ...d, [key]: key === "order" ? Number(e.target.value) : e.target.value } : d));

  return (
    <div className="flex flex-col gap-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold tracking-[0.1em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Team Photos
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <button onClick={openAdd} style={btnPrimary}>+ Add Member</button>
      </div>

      {/* Member cards */}
      {loading ? (
        <p className="text-sm" style={{ color: "#03033f66" }}>Loading…</p>
      ) : members.length === 0 ? (
        <div className="bg-white p-16 text-center" style={{ border: "1px solid #03033f0d" }}>
          <p className="text-sm" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            No team members yet. Click &ldquo;+ Add Member&rdquo; to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {members.map((m) => (
            <div key={m.id} className="bg-white flex flex-col" style={{ border: "1px solid #03033f0d" }}>
              {/* Photo square */}
              <div className="relative w-full" style={{ paddingBottom: "100%" }}>
                {m.photoUrl ? (
                  <Image src={m.photoUrl} alt={m.name} fill className="object-cover" />
                ) : (
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ backgroundColor: "#f8f8fb" }}
                  >
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "#03033f22" }}>
                      <circle cx="12" cy="8" r="5" />
                      <path d="M3 21c0-5 4-9 9-9s9 4 9 9" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-4 flex flex-col gap-3">
                <div>
                  <p className="font-bold text-sm truncate" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                    {m.name}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "#03033f77" }}>{m.position}</p>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => openEdit(m)}
                    className="text-xs font-bold tracking-widest uppercase hover:underline"
                    style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(m.id)}
                    className="text-xs font-bold tracking-widest uppercase hover:underline"
                    style={{ color: "#dc2626", fontFamily: "var(--font-brand), sans-serif", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white p-8 w-full max-w-sm flex flex-col gap-6">
            <div>
              <p
                className="font-bold text-sm tracking-widest uppercase"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                Remove Team Member?
              </p>
              <p className="text-xs mt-2" style={{ color: "#03033f77" }}>
                This cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => del(confirmDelete)}
                style={{ ...btnPrimary, flex: 1, padding: "10px 0", backgroundColor: "#dc2626" }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                style={{ ...btnGhost, flex: 1, padding: "10px 0" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit drawer */}
      {drawer !== "closed" && draft && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={closeDrawer} />
          <div
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 flex flex-col"
            style={{ backgroundColor: "#fff", boxShadow: "-8px 0 32px rgba(0,0,0,0.15)" }}
          >
            {/* Drawer header */}
            <div className="px-6 h-16 flex items-center justify-between flex-shrink-0" style={{ borderBottom: "1px solid #03033f0d" }}>
              <span
                className="text-sm font-bold tracking-widest uppercase"
                style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {drawer === "add" ? "Add Member" : "Edit Member"}
              </span>
              <button
                onClick={closeDrawer}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#03033f99", padding: 4 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
              {/* Photo upload */}
              <div className="flex flex-col gap-3">
                <p style={labelStyle}>Photo</p>
                {draft.photoUrl && (
                  <div className="relative w-full" style={{ paddingBottom: "100%" }}>
                    <Image src={draft.photoUrl} alt="" fill className="object-cover" />
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={uploadPhoto}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  style={{ ...btnGhost, opacity: uploading ? 0.5 : 1 }}
                >
                  {uploading ? "Uploading…" : draft.photoUrl ? "Change Photo" : "Upload Photo"}
                </button>
                {uploadError && (
                  <p className="text-xs" style={{ color: "#dc2626" }}>{uploadError}</p>
                )}
              </div>

              {/* Name */}
              <div className="flex flex-col gap-2">
                <label style={labelStyle}>Name</label>
                <input
                  value={draft.name}
                  onChange={patch("name")}
                  placeholder="e.g. James Gonard"
                  style={{ padding: "9px 12px", border: "1px solid #03033f22", outline: "none", fontSize: "13px", color: "#03033f", fontFamily: "var(--font-brand), sans-serif", width: "100%", boxSizing: "border-box" }}
                />
              </div>

              {/* Position */}
              <div className="flex flex-col gap-2">
                <label style={labelStyle}>Position</label>
                <input
                  value={draft.position}
                  onChange={patch("position")}
                  placeholder="e.g. Head of Sales"
                  style={{ padding: "9px 12px", border: "1px solid #03033f22", outline: "none", fontSize: "13px", color: "#03033f", fontFamily: "var(--font-brand), sans-serif", width: "100%", boxSizing: "border-box" }}
                />
              </div>

              {/* Display order */}
              <div className="flex flex-col gap-2">
                <label style={labelStyle}>Display Order</label>
                <input
                  type="number"
                  value={draft.order}
                  onChange={patch("order")}
                  min={1}
                  style={{ padding: "9px 12px", border: "1px solid #03033f22", outline: "none", fontSize: "13px", color: "#03033f", fontFamily: "var(--font-brand), sans-serif", width: "100px", boxSizing: "border-box" }}
                />
                <p className="text-xs" style={{ color: "#03033f66" }}>
                  Lower numbers appear first on the public team page.
                </p>
              </div>

              {formError && (
                <p className="text-xs font-bold" style={{ color: "#dc2626" }}>{formError}</p>
              )}
            </div>

            {/* Drawer footer */}
            <div className="p-6 flex-shrink-0" style={{ borderTop: "1px solid #03033f0d" }}>
              <button
                onClick={save}
                disabled={saving || uploading}
                style={{ ...btnPrimary, width: "100%", padding: "13px 0", opacity: saving || uploading ? 0.6 : 1 }}
              >
                {saving ? "Saving…" : drawer === "add" ? "Add Member" : "Save Changes"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
