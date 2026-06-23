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

const KV_KEY = "payments_v1";

export interface Payment {
  id: string;
  customerId: string | null; // null for unmatched e-transfers pending manual assignment
  customerName: string;
  amount: number;
  receivedAt: string; // ISO
  source: "email_auto" | "email_unmatched" | "manual";
  note?: string;
  sageSynced: boolean;
  balanceBefore?: number;
  balanceAfter?: number;
  emailUid?: string; // IMAP UID — used to deduplicate if agent replays the same email
}

export async function getPayments(): Promise<Payment[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    return (await kv.get<Payment[]>(KV_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function getPaymentsByCustomer(customerId: string): Promise<Payment[]> {
  const all = await getPayments();
  return all.filter((p) => p.customerId === customerId);
}

export async function getUnmatchedPayments(): Promise<Payment[]> {
  const all = await getPayments();
  return all.filter((p) => p.customerId === null);
}

export async function savePayment(payment: Payment): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const payments = await getPayments();
  await kv.set(KV_KEY, [payment, ...payments]);
}

export async function updatePayment(id: string, patch: Partial<Payment>): Promise<Payment | null> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const payments = await getPayments();
  const idx = payments.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...payments[idx], ...patch };
  payments[idx] = updated;
  await kv.set(KV_KEY, payments);
  return updated;
}
