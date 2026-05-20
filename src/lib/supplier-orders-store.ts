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

const KV_KEY = "supplier_orders_v1";

export type SupplierOrderStatus = "incoming" | "received" | "cancelled";

export interface SupplierOrderItem {
  productId: string;
  itemNo: string;
  name: string;
  skids: number;
  boxes: number;
  pricePerUnit: number;
  totalPrice: number;
}

export interface SupplierOrder {
  id: string;
  createdAt: string;
  approxDeliveryDate?: string;
  receivedAt?: string;
  notes?: string;
  status: SupplierOrderStatus;
  items: SupplierOrderItem[];
}

export async function getSupplierOrders(): Promise<SupplierOrder[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    return (await kv.get<SupplierOrder[]>(KV_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveSupplierOrder(order: SupplierOrder): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const orders = await getSupplierOrders();
  await kv.set(KV_KEY, [order, ...orders]);
}

export async function updateSupplierOrder(
  id: string,
  patch: Partial<Omit<SupplierOrder, "id" | "createdAt">>
): Promise<SupplierOrder | null> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const orders = await getSupplierOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const updated: SupplierOrder = { ...orders[idx], ...patch };
  orders[idx] = updated;
  await kv.set(KV_KEY, orders);
  return updated;
}

export function incomingByItemNo(orders: SupplierOrder[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const order of orders) {
    if (order.status !== "incoming") continue;
    for (const item of order.items) {
      result[item.itemNo] = (result[item.itemNo] ?? 0) + item.boxes;
    }
  }
  return result;
}

export function receivedByItemNo(orders: SupplierOrder[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const order of orders) {
    if (order.status !== "received") continue;
    for (const item of order.items) {
      result[item.itemNo] = (result[item.itemNo] ?? 0) + item.boxes;
    }
  }
  return result;
}
