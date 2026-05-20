import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    return createClient({ url, token });
  } catch {
    return null;
  }
}

const KV_KEY = "inventory_v1";

export interface StockLevel {
  onHand: number;
  updatedAt: string; // ISO — last time this was imported from Sage
}

export async function getInventory(): Promise<Record<string, StockLevel>> {
  const kv = getKV();
  if (!kv) return {};
  try {
    return (await kv.get<Record<string, StockLevel>>(KV_KEY)) ?? {};
  } catch {
    return {};
  }
}

export async function saveInventory(data: Record<string, StockLevel>): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, data);
}

// Parse a Sage 50 (or compatible) CSV export.
// Flexibly matches column headers for item number and quantity on hand.
// Returns null if the required columns can't be found.
export function parseSageCsv(
  raw: string
): { itemNo: string; onHand: number }[] | null {
  // Normalize line endings and strip BOM
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) return null;

  const ITEM_PATTERNS = [
    "item number", "item no", "item #", "item no.", "item_number",
    "itemnumber", "inventory number", "part number", "sku", "code",
  ];
  const QTY_PATTERNS = [
    "quantity on hand", "qty on hand", "on hand", "qtyonhand",
    "quantity_on_hand", "qty_on_hand", "available", "in stock",
    "stock", "boxes", "cases",
  ];

  function parseCsvLine(line: string): string[] {
    const fields: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/^"|"$/g, ""));

  const itemCol = headers.findIndex((h) => ITEM_PATTERNS.some((p) => h === p));
  const qtyCol = headers.findIndex((h) => QTY_PATTERNS.some((p) => h === p));

  // Fall back to first two columns if headers don't match
  const iCol = itemCol >= 0 ? itemCol : 0;
  const qCol = qtyCol >= 0 ? qtyCol : 1;

  const result: { itemNo: string; onHand: number }[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const rawItem = (fields[iCol] ?? "").trim();
    const rawQty = (fields[qCol] ?? "").trim();
    if (!rawItem) continue;
    const onHand = parseFloat(rawQty.replace(/,/g, ""));
    if (isNaN(onHand)) continue;
    result.push({ itemNo: rawItem, onHand: Math.max(0, Math.round(onHand)) });
  }
  return result.length > 0 ? result : null;
}
