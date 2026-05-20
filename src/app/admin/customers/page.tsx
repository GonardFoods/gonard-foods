"use client";

import { useState, useEffect } from "react";
import type { PublicCustomer } from "@/lib/customers-store";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
  backgroundColor: "#fff",
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ notes: "", balance: "", password: "" });
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", company: "", email: "", phone: "", password: "", notes: "", balance: "0" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/customers");
      if (res.ok) setCustomers(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(c: PublicCustomer) {
    setEditing(c.id);
    setEditForm({ notes: c.notes ?? "", balance: String(c.balance), password: "" });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: editForm.notes,
          balance: Number(editForm.balance),
          password: editForm.password || undefined,
        }),
      });
      if (res.ok) {
        const updated: PublicCustomer = await res.json();
        setCustomers((prev) => prev.map((c) => c.id === id ? updated : c));
        setEditing(null);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          company: createForm.company || undefined,
          email: createForm.email,
          phone: createForm.phone || undefined,
          password: createForm.password || undefined,
          notes: createForm.notes || undefined,
          balance: Number(createForm.balance) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setCreateError(data.error ?? "Failed to create customer."); return; }
      setCustomers((prev) => [data, ...prev]);
      setShowCreate(false);
      setCreateForm({ name: "", company: "", email: "", phone: "", password: "", notes: "", balance: "0" });
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Customers</h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {showCreate ? "✕ Cancel" : "+ New Customer"}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white p-6 flex flex-col gap-4" style={{ border: "1px solid #03033f14" }}>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>New Customer</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "name", label: "Full Name *", type: "text", required: true, placeholder: "Jane Smith" },
              { key: "company", label: "Company (optional)", type: "text", required: false, placeholder: "The Grand Restaurant" },
              { key: "email", label: "Email *", type: "email", required: true, placeholder: "jane@restaurant.com" },
              { key: "phone", label: "Phone (optional)", type: "tel", required: false, placeholder: "(403) 555-0100" },
              { key: "password", label: "Initial Password (optional)", type: "text", required: false, placeholder: "Leave blank to auto-generate" },
              { key: "balance", label: "Opening Balance ($)", type: "number", required: false, placeholder: "0" },
            ].map(({ key, label, type, required, placeholder }) => (
              <div key={key} className="flex flex-col gap-1.5">
                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{label}</label>
                <input
                  type={type} required={required} placeholder={placeholder}
                  value={createForm[key as keyof typeof createForm]}
                  onChange={(e) => setCreateForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="px-3 py-2 text-sm" style={inputStyle}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Admin Notes (optional)</label>
            <textarea rows={2} value={createForm.notes} onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))} className="px-3 py-2 text-sm resize-none" style={inputStyle} placeholder="Internal notes visible only to admins" />
          </div>
          {createError && <div className="px-3 py-2 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>{createError}</div>}
          <div className="flex gap-3">
            <button type="submit" disabled={creating} className="px-5 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-40" style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>
              {creating ? "Saving…" : "Save Customer"}
            </button>
          </div>
        </form>
      )}

      {/* Customer table */}
      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>No customers yet. Create one or wait for sign-ups.</div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Name", "Email", "Phone", "Balance", "Since", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const isExpanded = expanded === c.id;
                const isEditing = editing === c.id;
                return (
                  <>
                    <tr
                      key={c.id}
                      style={{ borderBottom: "1px solid #03033f08" }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => { setExpanded(isExpanded ? null : c.id); if (isEditing) setEditing(null); }}
                    >
                      <td className="px-4 py-3">
                        <div className="text-xs font-bold" style={{ color: "#03033f" }}>{c.name}</div>
                        {c.company && <div className="text-xs" style={{ color: "#03033f55" }}>{c.company}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}><a href={`mailto:${c.email}`} style={{ color: "#0284c7" }} onClick={(e) => e.stopPropagation()}>{c.email}</a></td>
                      <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{c.phone ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: c.balance > 0 ? "#854d0e" : "#166534" }}>
                        {c.balance > 0 ? `$${c.balance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}` : "$0.00"}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f55" }}>{fmt(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setExpanded(c.id); startEdit(c); }}
                          className="text-xs font-bold tracking-widest uppercase hover:opacity-60 transition-opacity"
                          style={{ color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${c.id}-detail`} style={{ backgroundColor: "#f8f8fb", borderBottom: "1px solid #03033f08" }}>
                        <td colSpan={6} className="px-6 py-4">
                          {isEditing ? (
                            <div className="flex flex-col gap-4 max-w-lg">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Outstanding Balance ($)</label>
                                  <input type="number" min="0" step="0.01" value={editForm.balance} onChange={(e) => setEditForm((f) => ({ ...f, balance: e.target.value }))} className="px-3 py-2 text-sm" style={inputStyle} />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Reset Password (optional)</label>
                                  <input type="text" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} className="px-3 py-2 text-sm" style={inputStyle} placeholder="Leave blank to keep current" />
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Admin Notes</label>
                                <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="px-3 py-2 text-sm resize-none" style={inputStyle} />
                              </div>
                              <div className="flex gap-3">
                                <button onClick={() => saveEdit(c.id)} disabled={saving} className="px-4 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-40" style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>
                                  {saving ? "Saving…" : "Save"}
                                </button>
                                <button onClick={() => setEditing(null)} className="px-4 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-60" style={{ border: "1px solid #03033f33", color: "#03033f99", fontFamily: "var(--font-brand), sans-serif" }}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs flex flex-col gap-2">
                              <p style={{ color: "#03033f88" }}><strong style={{ color: "#03033f" }}>Notes:</strong> {c.notes || <span style={{ color: "#03033f33" }}>None</span>}</p>
                              <p style={{ color: "#03033f88" }}><strong style={{ color: "#03033f" }}>Member since:</strong> {fmt(c.createdAt)}</p>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
