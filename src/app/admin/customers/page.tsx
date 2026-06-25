"use client";

import { useState, useEffect, useRef } from "react";
import type { PublicCustomer } from "@/lib/customers-store";
import type { SageCustomer } from "@/lib/sage-customers-store";
import SearchableSelect, { type SelectOption } from "@/components/SearchableSelect";

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

type SageSelection = { type: "linked" | "new"; sageName: string };

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<PublicCustomer[]>([]);
  const [sageCustomers, setSageCustomers] = useState<SageCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ notes: "", balance: "", password: "" });
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", company: "", email: "", phone: "", password: "", notes: "", balance: "0" });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Sage onboarding state
  const [sageSetup, setSageSetup] = useState<Record<string, SageSelection>>({});
  const [sageConfirming, setSageConfirming] = useState<string | null>(null);
  const [sageError, setSageError] = useState<Record<string, string>>({});

  // Sage customer list import
  const [showSageImport, setShowSageImport] = useState(false);
  const [sageImportText, setSageImportText] = useState("");
  const [sageImporting, setSageImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [custRes, sageRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/admin/sage-customers"),
      ]);
      if (custRes.ok) {
        const custs: PublicCustomer[] = await custRes.json();
        setCustomers(custs);
        const initial: Record<string, SageSelection> = {};
        custs.filter((c) => c.sageStatus === "pending").forEach((c) => {
          initial[c.id] = { type: "linked", sageName: "" };
        });
        setSageSetup(initial);
      }
      if (sageRes.ok) setSageCustomers(await sageRes.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // ── Sage setup ───────────────────────────────────────────────────────────────

  const sageOptions: SelectOption[] = sageCustomers.map((sc) => ({
    value: sc.name,
    label: sc.name,
  }));

  async function confirmSageSetup(customerId: string, customer: PublicCustomer) {
    const setup = sageSetup[customerId];
    if (!setup) return;

    let sageName: string;
    if (setup.type === "linked") {
      if (!setup.sageName) {
        setSageError((p) => ({ ...p, [customerId]: "Please select the matching Sage customer." }));
        return;
      }
      sageName = setup.sageName;
    } else {
      sageName = (customer.company || customer.name).trim();
    }

    setSageConfirming(customerId);
    setSageError((p) => ({ ...p, [customerId]: "" }));
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sageStatus: setup.type, sageName }),
      });
      if (res.ok) {
        await load();
      } else {
        const d = await res.json();
        setSageError((p) => ({ ...p, [customerId]: d.error ?? "Failed to save." }));
      }
    } finally {
      setSageConfirming(null);
    }
  }

  // ── Sage list import ─────────────────────────────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSageImportText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  async function importSageList() {
    setSageImporting(true);
    setImportMessage("");
    try {
      const res = await fetch("/api/admin/sage-customers", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: sageImportText,
      });
      const d = await res.json();
      if (res.ok) {
        setImportMessage(`Imported ${d.count} customers successfully.`);
        setSageImportText("");
        setShowSageImport(false);
        const updated = await fetch("/api/admin/sage-customers").then((r) => r.json());
        setSageCustomers(updated);
      } else {
        setImportMessage(d.error ?? "Import failed.");
      }
    } finally {
      setSageImporting(false);
    }
  }

  async function clearSageList() {
    if (!confirm("Clear the entire Sage customer list? This cannot be undone.")) return;
    await fetch("/api/admin/sage-customers", { method: "DELETE" });
    setSageCustomers([]);
    setImportMessage("List cleared.");
  }

  // ── Customer editing ─────────────────────────────────────────────────────────

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
      await load();
      setShowCreate(false);
      setCreateForm({ name: "", company: "", email: "", phone: "", password: "", notes: "", balance: "0" });
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  const pendingCustomers = customers.filter((c) => c.sageStatus === "pending");
  const onboardedCustomers = customers.filter((c) => c.sageStatus !== "pending");

  const labelCls = "text-xs font-bold tracking-widest uppercase";
  const labelColor = { color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" };

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
                <label className={labelCls} style={labelColor}>{label}</label>
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
            <label className={labelCls} style={labelColor}>Admin Notes (optional)</label>
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

      {loading ? (
        <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>Loading…</div>
      ) : (
        <>
          {/* ── Awaiting Sage Setup ─────────────────────────────────────────── */}
          {pendingCustomers.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="px-3 py-1 text-xs font-bold tracking-widest uppercase"
                  style={{ backgroundColor: "#fef9c3", color: "#854d0e", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Awaiting Sage Setup — {pendingCustomers.length} new customer{pendingCustomers.length !== 1 ? "s" : ""}
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: "#03033f88", lineHeight: 1.6 }}>
                These customers signed up or were added recently. For each one, indicate whether they already have an entry
                in Sage 50 or are brand new. This determines how the agent will handle their account.
              </p>
              <div className="flex flex-col gap-3">
                {pendingCustomers.map((c) => {
                  const sel = sageSetup[c.id] ?? { type: "linked" as const, sageName: "" };
                  const isConfirming = sageConfirming === c.id;
                  return (
                    <div key={c.id} className="p-4" style={{ border: "2px solid #fde68a", backgroundColor: "#fffbeb" }}>
                      <div className="flex flex-col sm:flex-row gap-6 items-start justify-between">
                        {/* Customer info */}
                        <div className="flex flex-col gap-1 min-w-0">
                          <p className="text-sm font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{c.name}</p>
                          {c.company && <p className="text-xs" style={{ color: "#03033f66" }}>{c.company}</p>}
                          <p className="text-xs" style={{ color: "#03033f55" }}>{c.email}</p>
                          <p className="text-xs" style={{ color: "#03033f44" }}>Joined {fmt(c.createdAt)}</p>
                        </div>

                        {/* Sage decision */}
                        <div className="flex flex-col gap-3 w-full sm:w-auto sm:min-w-[300px]">
                          {/* Radio options */}
                          <div className="flex flex-col gap-2">
                            {(["linked", "new"] as const).map((type) => (
                              <label key={type} className="flex items-start gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={`sageType-${c.id}`}
                                  checked={sel.type === type}
                                  onChange={() => setSageSetup((p) => ({ ...p, [c.id]: { ...sel, type } }))}
                                  style={{ marginTop: 2, accentColor: "#03033f" }}
                                />
                                <div>
                                  <p className="text-xs font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                                    {type === "linked" ? "Already in Sage" : "Brand new customer"}
                                  </p>
                                  <p className="text-xs" style={{ color: "#03033f66" }}>
                                    {type === "linked"
                                      ? "Match to an existing Sage customer entry"
                                      : "Agent will create them in Sage on next cycle"}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>

                          {/* Conditional inputs */}
                          {sel.type === "linked" ? (
                            <div className="flex flex-col gap-1.5">
                              <p className={labelCls} style={labelColor}>Select Sage customer</p>
                              {sageCustomers.length === 0 ? (
                                <p className="text-xs" style={{ color: "#854d0e" }}>
                                  No Sage customer list imported yet. Import one in the section below.
                                </p>
                              ) : (
                                <SearchableSelect
                                  options={sageOptions}
                                  value={sel.sageName}
                                  onChange={(v) => setSageSetup((p) => ({ ...p, [c.id]: { ...sel, sageName: v } }))}
                                  placeholder="— Search Sage customers —"
                                />
                              )}
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-xs" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                              Will be created in Sage as: <strong>{(c.company || c.name).trim()}</strong>
                            </div>
                          )}

                          {sageError[c.id] && (
                            <p className="text-xs" style={{ color: "#991b1b" }}>{sageError[c.id]}</p>
                          )}

                          <button
                            onClick={() => confirmSageSetup(c.id, c)}
                            disabled={isConfirming}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: "#03033f",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                              fontSize: "10px",
                              fontWeight: "bold",
                              letterSpacing: "0.15em",
                              textTransform: "uppercase",
                              fontFamily: "var(--font-brand), sans-serif",
                              opacity: isConfirming ? 0.5 : 1,
                              alignSelf: "flex-start",
                            }}
                          >
                            {isConfirming ? "Saving…" : "Confirm"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Main Customer Table ──────────────────────────────────────────── */}
          {onboardedCustomers.length === 0 && pendingCustomers.length === 0 ? (
            <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
              No customers yet. Create one or wait for sign-ups.
            </div>
          ) : onboardedCustomers.length > 0 ? (
            <div className="bg-white overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ borderBottom: "2px solid #03033f14" }}>
                    {["Name", "Email", "Phone", "Balance", "Sage", "Since", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {onboardedCustomers.map((c) => {
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
                          <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>
                            <a href={`mailto:${c.email}`} style={{ color: "#0284c7" }} onClick={(e) => e.stopPropagation()}>{c.email}</a>
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{c.phone ?? "—"}</td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: c.balance > 0 ? "#854d0e" : "#166534" }}>
                            {c.balance > 0 ? `$${c.balance.toLocaleString("en-CA", { minimumFractionDigits: 2 })}` : "$0.00"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase"
                              style={{
                                fontFamily: "var(--font-brand), sans-serif",
                                backgroundColor: c.sageStatus === "new" ? "#dcfce7" : c.sageStatus === "linked" ? "#eff6ff" : "#f4f4fa",
                                color: c.sageStatus === "new" ? "#166534" : c.sageStatus === "linked" ? "#1e40af" : "#03033f66",
                              }}
                            >
                              {c.sageStatus === "new" ? "New" : c.sageStatus === "linked" ? "Linked" : "—"}
                            </span>
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
                            <td colSpan={7} className="px-6 py-4">
                              {isEditing ? (
                                <div className="flex flex-col gap-4 max-w-lg">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                      <label className={labelCls} style={labelColor}>Outstanding Balance ($)</label>
                                      <input type="number" min="0" step="0.01" value={editForm.balance} onChange={(e) => setEditForm((f) => ({ ...f, balance: e.target.value }))} className="px-3 py-2 text-sm" style={inputStyle} />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                      <label className={labelCls} style={labelColor}>Reset Password (optional)</label>
                                      <input type="text" value={editForm.password} onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))} className="px-3 py-2 text-sm" style={inputStyle} placeholder="Leave blank to keep current" />
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    <label className={labelCls} style={labelColor}>Admin Notes</label>
                                    <textarea rows={2} value={editForm.notes} onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} className="px-3 py-2 text-sm resize-none" style={inputStyle} />
                                  </div>
                                  {c.sageName && (
                                    <p className="text-xs" style={{ color: "#03033f55" }}>
                                      Sage name: <strong style={{ color: "#03033f" }}>{c.sageName}</strong>
                                    </p>
                                  )}
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
                                  {c.sageName && <p style={{ color: "#03033f88" }}><strong style={{ color: "#03033f" }}>Sage name:</strong> {c.sageName}</p>}
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
            </div>
          ) : null}

          {/* ── Sage Customer List ────────────────────────────────────────────── */}
          <div style={{ borderTop: "1px solid #03033f14", paddingTop: "24px" }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Sage Customer List
                </h2>
                <p className="text-xs mt-1" style={{ color: "#03033f66" }}>
                  {sageCustomers.length > 0
                    ? `${sageCustomers.length} customer${sageCustomers.length !== 1 ? "s" : ""} imported`
                    : "No list imported yet — used for matching e-transfers and Sage setup."}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowSageImport((v) => !v); setImportMessage(""); }}
                  className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase hover:opacity-70"
                  style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {showSageImport ? "✕ Cancel" : sageCustomers.length > 0 ? "Replace List" : "Import CSV"}
                </button>
                {sageCustomers.length > 0 && (
                  <button
                    onClick={clearSageList}
                    className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase hover:opacity-70"
                    style={{ border: "1px solid #fca5a5", color: "#991b1b", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {importMessage && (
              <div className="px-3 py-2 text-xs mb-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                {importMessage}
              </div>
            )}

            {showSageImport && (
              <div className="flex flex-col gap-3 p-4" style={{ border: "1px solid #03033f14", backgroundColor: "#f8f8fb" }}>
                <p className="text-xs" style={{ color: "#03033f88", lineHeight: 1.6 }}>
                  Export your customer list from Sage 50 as a CSV (File → Import/Export → Export Records).
                  Paste the content below or select the file. The importer will auto-detect the customer name column.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase hover:opacity-70"
                    style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    Choose File
                  </button>
                  {sageImportText && <span className="text-xs" style={{ color: "#03033f66" }}>{sageImportText.split("\n").length} rows loaded</span>}
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleFileSelect} />
                <textarea
                  rows={6}
                  value={sageImportText}
                  onChange={(e) => setSageImportText(e.target.value)}
                  placeholder={"Paste CSV content here…\nExample:\nCustomer Name,Phone,Email\nSadid Household,(403) 555-0100,…"}
                  className="px-3 py-2 text-xs resize-y"
                  style={{ ...inputStyle, fontSize: "11px", fontFamily: "monospace" }}
                />
                <button
                  onClick={importSageList}
                  disabled={!sageImportText.trim() || sageImporting}
                  className="px-4 py-2 text-xs font-bold tracking-widest uppercase hover:opacity-80 disabled:opacity-40 self-start"
                  style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {sageImporting ? "Importing…" : "Import"}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
