import { createClient } from "@vercel/kv";
import { timingSafeEqual } from "crypto";

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
  // Sage 50 onboarding state:
  // "pending"  — new signup, admin hasn't decided yet (skip Sage sync)
  // "linked"   — existing Sage customer; sageName is their exact ledger name
  // "new"      — brand new customer; agent will create them in Sage
  // undefined  — legacy record, treated same as "linked" with derived name
  sageStatus?: "pending" | "linked" | "new";
  sageName?: string;
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

// Removes the account (login/profile). Their past orders and payments keep
// their own snapshot of name/email, so accounting history is unaffected.
export async function deleteCustomer(id: string): Promise<boolean> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const list = await getCustomers();
  const filtered = list.filter((c) => c.id !== id);
  if (filtered.length === list.length) return false;
  await kv.set(KV_KEY, filtered);
  return true;
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

// PBKDF2 (100k rounds) — a single SHA-256 pass is fast enough that an offline
// attacker with a leaked hash could brute-force weak passwords cheaply; PBKDF2
// is deliberately slow to make that impractical. Format: pbkdf2:<iters>:<salt>:<hex>
const PBKDF2_ITERATIONS = 100_000;

async function pbkdf2Hex(password: string, salt: string, iterations: number): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password + (process.env.SESSION_SECRET ?? "gonard-secret")),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Legacy format (pre-2026-08-06): `${salt}:${sha256Hex}` — single-round SHA-256,
// no "pbkdf2:" prefix. Kept only so existing customers can still log in;
// verifyPassword upgrades them to the new format on next successful login
// (see isLegacyHash + customer/login route) rather than forcing a mass reset.
async function legacyHashHex(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(salt + password + (process.env.SESSION_SECRET ?? "gonard-secret"));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function isLegacyHash(stored: string): boolean {
  return !stored.startsWith("pbkdf2:");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomUUID().replace(/-/g, "");
  const hex = await pbkdf2Hex(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hex}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith("pbkdf2:")) {
    const [, iterStr, salt, storedHex] = stored.split(":");
    const iterations = Number(iterStr);
    if (!salt || !storedHex || !iterations) return false;
    const hex = await pbkdf2Hex(password, salt, iterations);
    return timingSafeEqualHex(hex, storedHex);
  }
  const [salt, storedHex] = stored.split(":");
  if (!salt || !storedHex) return false;
  const hex = await legacyHashHex(password, salt);
  return timingSafeEqualHex(hex, storedHex);
}
