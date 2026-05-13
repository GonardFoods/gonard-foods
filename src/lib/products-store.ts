import { unstable_cache } from "next/cache";
import { products as staticProducts, type Product } from "@/data/products";

async function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try {
    const { createClient } = await import("@vercel/kv");
    return createClient({ url, token });
  } catch {
    return null;
  }
}

const KV_KEY = "products_v1";

export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    const kv = await getKV();
    if (!kv) return staticProducts;
    try {
      const stored = await kv.get<Product[]>(KV_KEY);
      return stored ?? staticProducts;
    } catch {
      return staticProducts;
    }
  },
  ["all-products"],
  { tags: ["products"] }
);

export async function saveAllProducts(updated: Product[]): Promise<void> {
  const kv = await getKV();
  if (!kv) throw new Error("KV unavailable");
  await kv.set(KV_KEY, updated);
}
