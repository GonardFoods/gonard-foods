"use client";

import { useState } from "react";
import type { PhotoEntry } from "@/data/products";

interface Props {
  photos: PhotoEntry[];
  alt: string;
  accentColor: string;
}

export default function PhotoSlideshow({ photos, alt, accentColor }: Props) {
  const [idx, setIdx] = useState(0);

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

  const prev = () => setIdx((i) => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx((i) => (i + 1) % photos.length);
  const current = photos[idx];

  return (
    <div
      className="aspect-square relative overflow-hidden"
      style={{ border: `1px solid ${accentColor}22`, backgroundColor: "#fff" }}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ backgroundColor: accentColor }} />

      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.url}
        alt={`${alt} — photo ${idx + 1}`}
        className="w-full h-full object-cover"
        style={{
          objectPosition: `${current.x ?? 50}% ${current.y ?? 50}%`,
          transform: `scale(${current.z ?? 1})`,
          transformOrigin: `${current.x ?? 50}% ${current.y ?? 50}%`,
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
                onClick={() => setIdx(i)}
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
