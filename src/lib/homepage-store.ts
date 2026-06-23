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

const KV_KEY = "homepage_v1";

// Maps category slug → photo URL
export type CategoryPhotos = Record<string, string>;

export async function getCategoryPhotos(): Promise<CategoryPhotos> {
  const kv = getKV();
  if (!kv) return {};
  try {
    return (await kv.get<CategoryPhotos>(KV_KEY)) ?? {};
  } catch {
    return {};
  }
}

export async function saveCategoryPhotos(photos: CategoryPhotos): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, photos);
}
