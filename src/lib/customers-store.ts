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

const KV_KEY = "customers_v1";

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  street1?: string;
  street2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  passwordHash: string;
  createdAt: string;
  notes?: string;       // admin-only notes
  balance: number;      // outstanding balance in CAD, set by admin
}

export type PublicCustomer = Omit<Customer, "passwordHash">;

export async function getCustomers(): Promise<Customer[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    return (await kv.get<Customer[]>(KV_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const list = await getCustomers();
  return list.find((c) => c.id === id) ?? null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const list = await getCustomers();
  return list.find((c) => c.email.toLowerCase() === email.toLowerCase()) ?? null;
}

export async function createCustomer(customer: Customer): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const list = await getCustomers();
  await kv.set(KV_KEY, [customer, ...list]);
}

export async function updateCustomer(
  id: string,
  patch: Partial<Omit<Customer, "id" | "createdAt">>
): Promise<Customer | null> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const list = await getCustomers();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...patch };
  await kv.set(KV_KEY, list);
  return list[idx];
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, "");
  const data = new TextEncoder().encode(
    salt + password + (process.env.SESSION_SECRET ?? "gonard-secret")
  );
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${hex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, storedHex] = stored.split(":");
  if (!salt || !storedHex) return false;
  const data = new TextEncoder().encode(
    salt + password + (process.env.SESSION_SECRET ?? "gonard-secret")
  );
  const buf = await crypto.subtle.digest("SHA-256", data);
  const hex = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === storedHex;
}
