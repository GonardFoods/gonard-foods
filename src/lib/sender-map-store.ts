import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try { return createClient({ url, token }); } catch { return null; }
}

const KV_KEY = "sender_map_v1";

export interface SenderEntry {
  customerId: string | null; // null for Sage-only customers with no web account
  customerName: string;      // display name / Sage name
}

// Keys are sender names lowercased + trimmed (from e-transfer "from" field)
export type SenderMap = Record<string, SenderEntry>;

export async function getSenderMap(): Promise<SenderMap> {
  const kv = getKV();
  if (!kv) return {};
  try { return (await kv.get<SenderMap>(KV_KEY)) ?? {}; } catch { return {}; }
}

export async function recordSenderMapping(
  senderName: string,
  entry: SenderEntry,
): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  const map = await getSenderMap();
  map[senderName.toLowerCase().trim()] = entry;
  await kv.set(KV_KEY, map);
}
