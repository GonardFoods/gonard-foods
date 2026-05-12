export interface PriceData {
  pricePerUnit: number | null;
  caseWeight: number | null;
}

// Gracefully return null if Vercel KV is not configured.
async function getKV() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  try {
    const { kv } = await import("@vercel/kv");
    return kv;
  } catch {
    return null;
  }
}

export async function getProductPriceData(productId: string): Promise<PriceData> {
  const kv = await getKV();
  if (!kv) return { pricePerUnit: null, caseWeight: null };
  try {
    const raw = await kv.hgetall(`product:${productId}`);
    if (!raw) return { pricePerUnit: null, caseWeight: null };
    return {
      pricePerUnit: raw.pricePerUnit != null ? Number(raw.pricePerUnit) : null,
      caseWeight: raw.caseWeight != null ? Number(raw.caseWeight) : null,
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
  const payload: Record<string, number | null> = {};
  if (data.pricePerUnit !== undefined) payload.pricePerUnit = data.pricePerUnit;
  if (data.caseWeight !== undefined) payload.caseWeight = data.caseWeight;
  if (Object.keys(payload).length > 0) {
    await kv.hset(`product:${productId}`, payload);
  }
}
