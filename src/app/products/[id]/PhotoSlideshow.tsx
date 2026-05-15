"use client";

import { useState } from "react";
import { getDetailCrop, type PhotoEntry } from "@/data/products";

interface Props {
  photos: PhotoEntry[];
  alt: string;
  accentColor: string;
}

export default function PhotoSlideshow({ photos, alt, accentColor }: Props) {
  const [idx, setIdx] = useState(0);
  // Natural image dimensions — loaded via onLoad, used to compute correct transform-origin
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  if (photos.length === 0) {
    return (
      <div
        className="aspect-square flex flex-col items-center justify-center gap-4 relative"
        style={{ backgroundColor: accentColor + "10", border: `1px solid ${accentColor}22` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: accentColor }} />
        <div className="flex flex-col items-center gap-3 opacity-40">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <p className="text-xs tracking-widest uppercase" style={{ color: accentColor + "88", fontFamily: "var(--font-brand), sans-serif" }}>
          Photo Coming Soon
        </p>
      </div>
    );
  }

  function changeIdx(newIdx: number) {
    setIdx(newIdx);
    setNaturalSize(null);
  }

  const prev = () => changeIdx((idx - 1 + photos.length) % photos.length);
  const next = () => changeIdx((idx + 1) % photos.length);
  const current = photos[idx];
  const { x, y, z } = getDetailCrop(current);

  // Map focal point in image-space (0-100) to transform-origin in element-space (0-100).
  // With object-fit:contain in a 1:1 square container, a landscape image fills the width
  // and has letterbox bars top/bottom. A portrait image fills the height with pillarbox bars
  // left/right. The bars shift the mapping between image coordinates and element coordinates.
  function containOrigin(): string {
    if (!naturalSize) return `${x}% ${y}%`;
    const imgAspect = naturalSize.w / naturalSize.h;
    if (imgAspect > 1) {
      // Landscape: image fills container width, letterbox top+bottom
      const imgFrac = 1 / imgAspect; // image height as fraction of container height
      const barFrac = (1 - imgFrac) / 2;
      const oy = (barFrac + (y / 100) * imgFrac) * 100;
      return `${x}% ${oy}%`;
    } else if (imgAspect < 1) {
      // Portrait: image fills container height, pillarbox left+right
      const imgFrac = imgAspect; // image width as fraction of container width
      const barFrac = (1 - imgFrac) / 2;
      const ox = (barFrac + (x / 100) * imgFrac) * 100;
      return `${ox}% ${y}%`;
    }
    return `${x}% ${y}%`; // square image, no bars
  }

  return (
    <div
      className="aspect-square relative overflow-hidden"
      style={{ border: `1px solid ${accentColor}22`, backgroundColor: "#fff" }}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ backgroundColor: accentColor }} />

      {/* Photo — object-contain so the full original image is the baseline; zoom crops in */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={`${alt} — photo ${idx + 1}`}
        className="w-full h-full object-contain"
        style={{ transform: `scale(${z})`, transformOrigin: containOrigin() }}
        onLoad={(e) => {
          const el = e.currentTarget;
          setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
        }}
      />

      {/* Navigation — only shown when more than one photo */}
      {photos.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(2px)" }}
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center text-lg font-bold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", color: "#fff", backdropFilter: "blur(2px)" }}
          >
            ›
          </button>

          {/* Dot indicators */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {photos.map((_, i) => (
              <button
                key={i}
                onClick={() => changeIdx(i)}
                aria-label={`Photo ${i + 1}`}
                className="w-1.5 h-1.5 rounded-full transition-opacity"
                style={{
                  backgroundColor: i === idx ? "#fff" : "rgba(255,255,255,0.45)",
                  transform: i === idx ? "scale(1.3)" : "scale(1)",
                  transition: "transform 0.15s, opacity 0.15s",
                }}
              />
            ))}
          </div>

          {/* Counter */}
          <div
            className="absolute top-4 right-3 z-10 px-2 py-0.5 text-xs"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
          >
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}
