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

const KV_KEY = "drivers_v1";

export interface Driver {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
}

export async function getDrivers(): Promise<Driver[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    const data = await kv.get<Driver[]>(KV_KEY);
    return (data ?? []).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export async function getDriverById(id: string): Promise<Driver | null> {
  const drivers = await getDrivers();
  return drivers.find((d) => d.id === id) ?? null;
}

export async function saveDrivers(drivers: Driver[]): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, drivers);
}
