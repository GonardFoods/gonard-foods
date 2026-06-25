"use client";
import { useState, useRef, useEffect } from "react";

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  group?: string;
}

interface Props {
  options: SelectOption[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function SearchableSelect({
  options, value, onChange, placeholder = "— Select —", disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const selected = options.find((o) => o.value === value);

  const q = query.toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          (o.sublabel?.toLowerCase().includes(q) ?? false),
      )
    : options;

  // Group preserving insertion order
  const groups: Map<string, SelectOption[]> = new Map();
  for (const o of filtered) {
    const g = o.group ?? "";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(o);
  }

  const triggerStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    border: "1px solid #03033f33",
    backgroundColor: disabled ? "#f8f8fb" : "#fff",
    color: value ? "#03033f" : "#03033f66",
    fontFamily: "var(--font-brand), sans-serif",
    fontSize: "12px",
    textAlign: "left",
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    outline: "none",
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((v) => !v); setQuery(""); } }}
        style={triggerStyle}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
          {selected
            ? `${selected.label}${selected.sublabel ? ` — ${selected.sublabel}` : ""}`
            : placeholder}
        </span>
        <span style={{ marginLeft: 8, color: "#03033f55", fontSize: "9px", flexShrink: 0 }}>▼</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 1px)",
            left: 0,
            right: 0,
            zIndex: 200,
            backgroundColor: "#fff",
            border: "1px solid #03033f33",
            maxHeight: "260px",
            overflowY: "auto",
            boxShadow: "0 6px 16px rgba(3,3,63,0.12)",
          }}
        >
          <div style={{ padding: "6px 8px", borderBottom: "1px solid #03033f0f", position: "sticky", top: 0, backgroundColor: "#fff" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search…"
              style={{
                width: "100%",
                padding: "5px 8px",
                border: "1px solid #03033f22",
                fontSize: "12px",
                color: "#03033f",
                fontFamily: "var(--font-brand), sans-serif",
                outline: "none",
                backgroundColor: "#f8f8fb",
                boxSizing: "border-box",
              }}
            />
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: "10px 12px", fontSize: "12px", color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}>
              No results
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, items]) => (
              <div key={group || "__default"}>
                {group && (
                  <div
                    style={{
                      padding: "5px 10px 3px",
                      fontSize: "9px",
                      fontWeight: "bold",
                      letterSpacing: "0.15em",
                      textTransform: "uppercase",
                      color: "#03033f77",
                      backgroundColor: "#f4f4fa",
                      fontFamily: "var(--font-brand), sans-serif",
                      borderTop: "1px solid #03033f08",
                    }}
                  >
                    {group}
                  </div>
                )}
                {items.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "8px 12px",
                      textAlign: "left",
                      backgroundColor: o.value === value ? "#eeeef8" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      color: "#03033f",
                      fontFamily: "var(--font-brand), sans-serif",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = "#eeeef8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.backgroundColor = o.value === value ? "#eeeef8" : "transparent")}
                  >
                    {o.label}
                    {o.sublabel && (
                      <span style={{ marginLeft: 6, color: "#03033f55", fontSize: "11px" }}>
                        — {o.sublabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
