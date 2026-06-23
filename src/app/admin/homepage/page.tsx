"use client";

import { useState, useEffect, useRef } from "react";

const CATEGORIES = [
  { slug: "chicken",     label: "Chicken" },
  { slug: "beef",        label: "Beef" },
  { slug: "lamb",        label: "Lamb" },
  { slug: "goat",        label: "Goat" },
  { slug: "turkey-duck", label: "Turkey & Duck" },
  { slug: "seafood",     label: "Seafood" },
];

const labelStyle: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 700,
  letterSpacing: "0.15em",
  textTransform: "uppercase",
  color: "#03033f99",
  fontFamily: "var(--font-brand), sans-serif",
};

export default function AdminHomepagePage() {
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null); // slug being uploaded
  const [uploadError, setUploadError] = useState<Record<string, string>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/homepage");
    setPhotos(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function uploadPhoto(slug: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4.5 * 1024 * 1024) {
      setUploadError((prev) => ({ ...prev, [slug]: "Photo must be under 4.5 MB." }));
      e.target.value = "";
      return;
    }
    setUploading(slug);
    setUploadError((prev) => ({ ...prev, [slug]: "" }));

    const uploadRes = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { "Content-Type": file.type, "X-Filename": file.name },
      body: file,
    });
    if (!uploadRes.ok) {
      setUploadError((prev) => ({ ...prev, [slug]: "Upload failed. Please try again." }));
      setUploading(null);
      e.target.value = "";
      return;
    }
    const { url } = await uploadRes.json();

    await fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, photoUrl: url }),
    });

    setPhotos((prev) => ({ ...prev, [slug]: url }));
    setUploading(null);
    e.target.value = "";
  }

  async function removePhoto(slug: string) {
    await fetch("/api/admin/homepage", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, photoUrl: null }),
    });
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold tracking-[0.1em] uppercase"
          style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
        >
          Homepage Photos
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        <p className="text-sm mt-4" style={{ color: "#03033f77" }}>
          These photos appear in the product category cards on the public home page.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#03033f66" }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => {
            const photoUrl = photos[cat.slug];
            const isUploading = uploading === cat.slug;
            const err = uploadError[cat.slug];

            return (
              <div
                key={cat.slug}
                className="bg-white flex flex-col"
                style={{ border: "1px solid #03033f0d" }}
              >
                {/* Photo preview (16:9) */}
                <div className="relative w-full overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={cat.label}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ backgroundColor: "#f0f0f5" }}
                    >
                      <span style={{ ...labelStyle, color: "#03033f33" }}>Photo Coming Soon</span>
                    </div>
                  )}
                </div>

                {/* Category label + controls */}
                <div className="p-4 flex flex-col gap-3">
                  <p
                    className="font-bold text-sm tracking-widest uppercase"
                    style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}
                  >
                    {cat.label}
                  </p>

                  <input
                    ref={(el) => { fileRefs.current[cat.slug] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadPhoto(cat.slug, e)}
                  />

                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={() => fileRefs.current[cat.slug]?.click()}
                      disabled={isUploading}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#03033f",
                        color: "#fff",
                        border: "none",
                        cursor: isUploading ? "default" : "pointer",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.15em",
                        textTransform: "uppercase",
                        fontFamily: "var(--font-brand), sans-serif",
                        opacity: isUploading ? 0.5 : 1,
                      }}
                    >
                      {isUploading ? "Uploading…" : photoUrl ? "Replace" : "Upload Photo"}
                    </button>

                    {photoUrl && (
                      <button
                        onClick={() => removePhoto(cat.slug)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "transparent",
                          color: "#dc2626",
                          border: "1px solid #dc262633",
                          cursor: "pointer",
                          fontSize: "10px",
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-brand), sans-serif",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  {err && (
                    <p className="text-xs" style={{ color: "#dc2626" }}>{err}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
