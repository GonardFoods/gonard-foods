import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try { return createClient({ url, token }); } catch { return null; }
}

const KV_KEY = "sage_customers_v1";

export interface SageCustomer {
  id: string;
  name: string; // exact name as it appears in the Sage customer ledger
}

export async function getSageCustomers(): Promise<SageCustomer[]> {
  const kv = getKV();
  if (!kv) return [];
  try { return (await kv.get<SageCustomer[]>(KV_KEY)) ?? []; } catch { return []; }
}

export async function saveSageCustomers(customers: SageCustomer[]): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, customers);
}
