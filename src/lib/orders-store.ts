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

const KV_KEY = "orders_v1";

export interface OrderItem {
  productId: string;
  itemNo: string;
  name: string;
  qty: number; // cases
}

export interface CustomerInfo {
  name: string;
  company?: string;
  email: string;
  phone?: string;
}

export type OrderStatus = "pending" | "fulfilled" | "cancelled" | "archived";

export interface WebOrder {
  id: string;
  createdAt: string; // ISO
  customer: CustomerInfo;
  items: OrderItem[];
  notes?: string;
  status: OrderStatus;
  fulfilledAt?: string;
  archivedAt?: string;
}

export async function getOrders(): Promise<WebOrder[]> {
  const kv = getKV();
  if (!kv) return [];
  try {
    return (await kv.get<WebOrder[]>(KV_KEY)) ?? [];
  } catch {
    return [];
  }
}

export async function saveOrder(order: WebOrder): Promise<void> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const orders = await getOrders();
  await kv.set(KV_KEY, [order, ...orders]); // newest first
}

export async function updateOrder(
  id: string,
  patch: Partial<Omit<WebOrder, "id" | "createdAt">>
): Promise<WebOrder | null> {
  const kv = getKV();
  if (!kv) throw new Error("KV unavailable");
  const orders = await getOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx === -1) return null;
  const updated: WebOrder = { ...orders[idx], ...patch };
  orders[idx] = updated;
  await kv.set(KV_KEY, orders);
  return updated;
}

// Returns total pending cases per itemNo across all pending orders
export function pendingByItemNo(orders: WebOrder[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const order of orders) {
    if (order.status !== "pending") continue;
    for (const item of order.items) {
      result[item.itemNo] = (result[item.itemNo] ?? 0) + item.qty;
    }
  }
  return result;
}
