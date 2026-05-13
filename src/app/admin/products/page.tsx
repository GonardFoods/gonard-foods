"use client";

import { useState, useEffect, useRef } from "react";
import { upload } from "@vercel/blob/client";
import { CATEGORY_LABELS, getProductPhotos, type Category, type FreshFrozen, type Product } from "@/data/products";

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [Category, string][];

const CATEGORY_COLORS: Record<Category, string> = {
  chicken: "#f59e0b",
  beef: "#dc2626",
  lamb: "#7c3aed",
  goat: "#059669",
  "turkey-duck": "#0284c7",
  seafood: "#0891b2",
};

const FF_OPTIONS: { value: FreshFrozen | ""; label: string }[] = [
  { value: "", label: "— Not specified" },
  { value: "fresh", label: "Fresh" },
  { value: "frozen", label: "Frozen" },
  { value: "both", label: "Both" },
];

function slugify(str: string) {
  return str.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

const EMPTY_DRAFT: Partial<Product> = {
  name: "",
  itemNo: "",
  category: "chicken",
  subcategory: "",
  description: "",
  unit: "KG",
  freshFrozen: null,
  halal: true,
  supplier: null,
  tags: [],
  marketPrice: null,
  salePrice: null,
  saleEndDate: null,
  photos: [],
  photoUrl: null,
};

const inputStyle = {
  border: "1px solid #03033f33",
  color: "#03033f",
  fontFamily: "var(--font-brand), sans-serif",
  outline: "none",
  backgroundColor: "#fff",
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | Category>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"add" | "edit">("add");
  const [draft, setDraft] = useState<Partial<Product>>({ ...EMPTY_DRAFT });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setDraft({ ...EMPTY_DRAFT, photos: [] });
    setDrawerMode("add");
    setError(null);
    setUploadError(null);
    setPhotoUrlInput("");
    setDrawerOpen(true);
  }

  function openEdit(product: Product) {
    setDraft({ ...product, photos: getProductPhotos(product) });
    setDrawerMode("edit");
    setError(null);
    setUploadError(null);
    setPhotoUrlInput("");
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setError(null);
    setUploadError(null);
  }

  function setProp<K extends keyof Product>(key: K, value: Product[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  // ── Photo helpers ──────────────────────────────────────────────────────────
  const photos = draft.photos ?? [];

  function movePhoto(i: number, dir: -1 | 1) {
    const next = [...photos];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setDraft((d) => ({ ...d, photos: next }));
  }

  function removePhoto(i: number) {
    setDraft((d) => ({ ...d, photos: (d.photos ?? []).filter((_, idx) => idx !== i) }));
  }

  function addPhotoUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) return;
    setDraft((d) => ({ ...d, photos: [...(d.photos ?? []), trimmed] }));
    setPhotoUrlInput("");
  }

  async function handlePhotoUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      // upload() goes directly from browser → Vercel Blob, bypassing Next.js body size limits
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/admin/upload",
      });
      setDraft((d) => ({ ...d, photos: [...(d.photos ?? []), blob.url] }));
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed — check file type and try again.");
    } finally {
      setUploading(false);
    }
  }

  // ── Save / delete ──────────────────────────────────────────────────────────
  async function save() {
    setError(null);
    if (!draft.name?.trim()) { setError("Name is required."); return; }
    if (!draft.itemNo?.trim()) { setError("Item No. is required."); return; }
    if (!draft.unit?.trim()) { setError("Unit is required."); return; }

    setSaving(true);
    try {
      const payload = {
        ...draft,
        freshFrozen: (draft.freshFrozen as FreshFrozen) || null,
        photos: draft.photos ?? [],
        photoUrl: null,
      };

      if (drawerMode === "add") {
        const id = slugify(draft.itemNo!);
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id }),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setError(b.error ?? "Failed to add product.");
          return;
        }
      } else {
        const res = await fetch(`/api/admin/products/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const b = await res.json().catch(() => ({}));
          setError(b.error ?? "Failed to save.");
          return;
        }
      }
      closeDrawer();
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (res.ok) {
      setConfirmDelete(null);
      await load();
    }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = products.filter((p) => {
    if (catFilter !== "all" && p.category !== catFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.itemNo.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-[0.1em] uppercase"
            style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Products
          </h1>
          <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          + Add Product
        </button>
      </div>

      {/* Search + filter */}
      <div className="bg-white p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or item no..."
          className="flex-1 px-4 py-2 text-sm"
          style={inputStyle}
        />
        <div className="flex flex-wrap gap-2">
          {([["all", "All"]] as [string, string][]).concat(CATEGORIES).map(([val, label]) => {
            const active = catFilter === val;
            return (
              <button
                key={val}
                onClick={() => setCatFilter(val as "all" | Category)}
                className="px-3 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors"
                style={{
                  fontFamily: "var(--font-brand), sans-serif",
                  backgroundColor: active ? "#03033f" : "transparent",
                  color: active ? "#fff" : "#03033f99",
                  border: active ? "1px solid #03033f" : "1px solid #03033f33",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
        <span className="text-xs whitespace-nowrap" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
          {filtered.length} of {products.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white overflow-x-auto">
        {loading ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-xs tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            No products found
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr style={{ borderBottom: "2px solid #03033f14" }}>
                {["Photo", "Name & Item No.", "Category", "Subcategory", "Unit", "F/F", "Halal", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase"
                    style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const productPhotos = getProductPhotos(p);
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #03033f08" }} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        className="w-12 h-10 flex items-center justify-center overflow-hidden flex-shrink-0 relative"
                        style={{ backgroundColor: CATEGORY_COLORS[p.category] + "18", border: `1px solid ${CATEGORY_COLORS[p.category]}33` }}
                      >
                        {productPhotos.length > 0 ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={productPhotos[0]} alt="" className="w-full h-full object-cover absolute inset-0" />
                        ) : (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[p.category] + "66" }} />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-bold text-xs leading-snug" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                        {p.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}>
                        #{p.itemNo}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase whitespace-nowrap"
                        style={{ backgroundColor: CATEGORY_COLORS[p.category] + "18", color: CATEGORY_COLORS[p.category], fontFamily: "var(--font-brand), sans-serif" }}
                      >
                        {CATEGORY_LABELS[p.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{p.subcategory}</td>
                    <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>{p.unit}</td>
                    <td className="px-4 py-3 text-xs capitalize" style={{ color: "#03033f88" }}>{p.freshFrozen ?? "—"}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: p.halal ? "#16a34a" : "#03033f44", fontFamily: "var(--font-brand), sans-serif" }}>
                      {p.halal ? "✓" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {confirmDelete === p.id ? (
                          <>
                            <span className="text-xs" style={{ color: "#03033f88" }}>Delete?</span>
                            <button onClick={() => remove(p.id)} className="text-xs font-bold px-2 py-1" style={{ backgroundColor: "#dc2626", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}>Yes</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs font-bold px-2 py-1" style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>No</button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(p)}
                              className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 transition-opacity hover:opacity-70"
                              style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 transition-opacity hover:opacity-70"
                              style={{ border: "1px solid #dc262633", color: "#dc2626", fontFamily: "var(--font-brand), sans-serif" }}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Drawer ────────────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.35)" }} onClick={closeDrawer} />

          <div className="relative w-full max-w-lg h-full flex flex-col overflow-hidden" style={{ backgroundColor: "#fff" }}>
            {/* Drawer header */}
            <div className="px-6 py-5 flex items-center justify-between flex-shrink-0" style={{ backgroundColor: "#03033f" }}>
              <h2 className="text-sm font-bold tracking-[0.2em] uppercase text-white" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
                {drawerMode === "add" ? "Add Product" : "Edit Product"}
              </h2>
              <button onClick={closeDrawer} className="text-white/60 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">
              {error && (
                <div className="px-4 py-3 text-xs" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                  {error}
                </div>
              )}

              <Field label="Name *">
                <input type="text" value={draft.name ?? ""} onChange={(e) => setProp("name", e.target.value)} className="w-full px-3 py-2 text-sm" style={inputStyle} placeholder="e.g. Chicken Breast Boneless Skinless" />
              </Field>

              <Field label="Item No. *">
                <input type="text" value={draft.itemNo ?? ""} onChange={(e) => setProp("itemNo", e.target.value)} className="w-full px-3 py-2 text-sm" style={inputStyle} placeholder="e.g. 157" disabled={drawerMode === "edit"} />
                {drawerMode === "add" && (
                  <p className="text-xs mt-1" style={{ color: "#03033f66" }}>URL ID: <code>{slugify(draft.itemNo ?? "") || "—"}</code></p>
                )}
              </Field>

              <Field label="Category *">
                <select value={draft.category ?? "chicken"} onChange={(e) => setProp("category", e.target.value as Category)} className="w-full px-3 py-2 text-sm" style={inputStyle}>
                  {CATEGORIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                </select>
              </Field>

              <Field label="Subcategory">
                <input type="text" value={draft.subcategory ?? ""} onChange={(e) => setProp("subcategory", e.target.value)} className="w-full px-3 py-2 text-sm" style={inputStyle} placeholder="e.g. Wings, Breast, Stew" />
              </Field>

              <Field label="Description">
                <textarea value={draft.description ?? ""} onChange={(e) => setProp("description", e.target.value)} rows={3} className="w-full px-3 py-2 text-sm resize-none" style={inputStyle} placeholder="Brief product description" />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Unit *">
                  <input type="text" value={draft.unit ?? ""} onChange={(e) => setProp("unit", e.target.value)} className="w-full px-3 py-2 text-sm" style={inputStyle} placeholder="KG, LBS, CASE…" />
                </Field>
                <Field label="Fresh / Frozen">
                  <select value={draft.freshFrozen ?? ""} onChange={(e) => setProp("freshFrozen", (e.target.value as FreshFrozen) || null)} className="w-full px-3 py-2 text-sm" style={inputStyle}>
                    {FF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Supplier">
                <input type="text" value={draft.supplier ?? ""} onChange={(e) => setProp("supplier", e.target.value || null)} className="w-full px-3 py-2 text-sm" style={inputStyle} placeholder="e.g. Agrosuper (optional)" />
              </Field>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="halal" checked={draft.halal ?? true} onChange={(e) => setProp("halal", e.target.checked)} className="w-4 h-4" style={{ accentColor: "#03033f" }} />
                <label htmlFor="halal" className="text-xs font-bold tracking-widest uppercase cursor-pointer" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                  Halal Certified
                </label>
              </div>

              {/* ── Photos ─────────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>
                    Photos{photos.length > 0 ? ` (${photos.length})` : ""}
                  </span>
                  {photos.length > 0 && (
                    <span className="text-xs" style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}>
                      First photo shown in catalog
                    </span>
                  )}
                </div>

                {/* Photo list */}
                {photos.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {photos.map((url, i) => (
                      <div key={`${url}-${i}`} className="flex items-center gap-2 p-2" style={{ border: "1px solid #03033f0d", backgroundColor: "#f8f8fb" }}>
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-16 h-12 object-cover flex-shrink-0" style={{ border: "1px solid #03033f14" }} />

                        {/* Label */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
                            {i === 0 ? "Main photo" : `Photo ${i + 1}`}
                          </p>
                          <p className="text-xs truncate mt-0.5" style={{ color: "#03033f44" }}>{url.split("/").pop()}</p>
                        </div>

                        {/* Order controls */}
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => movePhoto(i, -1)}
                            disabled={i === 0}
                            className="w-6 h-5 text-xs flex items-center justify-center disabled:opacity-20 transition-opacity hover:opacity-60"
                            style={{ border: "1px solid #03033f22", color: "#03033f" }}
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => movePhoto(i, 1)}
                            disabled={i === photos.length - 1}
                            className="w-6 h-5 text-xs flex items-center justify-center disabled:opacity-20 transition-opacity hover:opacity-60"
                            style={{ border: "1px solid #03033f22", color: "#03033f" }}
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>

                        {/* Remove */}
                        <button
                          onClick={() => removePhoto(i)}
                          className="w-6 h-6 flex items-center justify-center text-sm transition-opacity hover:opacity-70"
                          style={{ color: "#dc2626" }}
                          title="Remove"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <button
                  type="button"
                  onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                  disabled={uploading}
                  className="w-full px-4 py-3 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ border: "1px dashed #03033f44", color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  {uploading ? "Uploading…" : photos.length > 0 ? "+ Add Another Photo" : "Upload Photo"}
                </button>

                {/* Upload error — shown right below button */}
                {uploadError && (
                  <div className="px-3 py-2 text-xs leading-relaxed" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                    {uploadError}
                  </div>
                )}

                {/* URL paste */}
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={photoUrlInput}
                    onChange={(e) => setPhotoUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPhotoUrl(photoUrlInput); } }}
                    className="flex-1 px-3 py-2 text-sm"
                    style={inputStyle}
                    placeholder="Or paste a URL…"
                  />
                  <button
                    onClick={() => addPhotoUrl(photoUrlInput)}
                    disabled={!photoUrlInput.trim()}
                    className="px-4 py-2 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70 disabled:opacity-30"
                    style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    Add
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePhotoUpload(file);
                    e.target.value = "";
                  }}
                />
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid #03033f0d" }}>
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-3 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
              >
                {saving ? "Saving…" : drawerMode === "add" ? "Add Product" : "Save Changes"}
              </button>
              <button
                onClick={closeDrawer}
                className="px-5 py-3 text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-70"
                style={{ border: "1px solid #03033f33", color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
