export interface PriceData {
  pricePerUnit: number | null;
  caseWeight: number | null;
  pricingType: "per_weight" | "per_box";
}

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

export async function getProductPriceData(productId: string): Promise<PriceData> {
  const kv = await getKV();
  if (!kv) return { pricePerUnit: null, caseWeight: null, pricingType: "per_weight" };
  try {
    const raw = await kv.hgetall(`product:${productId}`);
    if (!raw) return { pricePerUnit: null, caseWeight: null, pricingType: "per_weight" };
    return {
      pricePerUnit: raw.pricePerUnit != null ? Number(raw.pricePerUnit) : null,
      caseWeight: raw.caseWeight != null ? Number(raw.caseWeight) : null,
      pricingType: raw.pricingType === "per_box" ? "per_box" : "per_weight",
    };
  } catch {
    return { pricePerUnit: null, caseWeight: null };
  }
}

export async function getAllProductPriceData(
  productIds: string[]
): Promise<Record<string, PriceData>> {
  const kv = await getKV();
  const result: Record<string, PriceData> = {};
  if (!kv) return result;

  await Promise.all(
    productIds.map(async (id) => {
      try {
        const raw = await kv.hgetall(`product:${id}`);
        result[id] = {
          pricePerUnit: raw?.pricePerUnit != null ? Number(raw.pricePerUnit) : null,
          caseWeight: raw?.caseWeight != null ? Number(raw.caseWeight) : null,
          pricingType: raw?.pricingType === "per_box" ? "per_box" : "per_weight",
        };
      } catch {
        result[id] = { pricePerUnit: null, caseWeight: null };
      }
    })
  );

  return result;
}

export async function setProductPriceData(
  productId: string,
  data: Partial<PriceData>
): Promise<void> {
  const kv = await getKV();
  if (!kv) return;
  const payload: Record<string, number | string | null> = {};
  if (data.pricePerUnit !== undefined) payload.pricePerUnit = data.pricePerUnit;
  if (data.caseWeight !== undefined) payload.caseWeight = data.caseWeight;
  if (data.pricingType !== undefined) payload.pricingType = data.pricingType;
  if (Object.keys(payload).length > 0) {
    await kv.hset(`product:${productId}`, payload);
  }
}
