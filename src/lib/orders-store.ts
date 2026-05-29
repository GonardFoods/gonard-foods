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
  pricingType?: "per_weight" | "per_box";
  weightUnit?: "KG" | "LB";
  totalWeight?: number; // total weight in kg/lb for per_weight products
  pricePerUnit?: number; // $/kg, $/lb, or $/box (fire-sale override or standard)
  lineTotal?: number; // computed at finalization
}

export interface CustomerInfo {
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
}

export type OrderStatus = "pending" | "invoiced" | "fulfilled" | "cancelled" | "archived";

export interface WebOrder {
  id: string;
  createdAt: string; // ISO
  customerId?: string; // links to a Customer profile if one exists
  customer: CustomerInfo;
  fulfillment?: "pickup" | "delivery";
  address?: string;
  items: OrderItem[];
  notes?: string;
  status: OrderStatus;
  invoiceTotal?: number;
  invoicedAt?: string;
  fulfilledAt?: string;
  archivedAt?: string;
  sageSynced?: boolean;
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
    if (order.status !== "pending" && order.status !== "invoiced") continue;
    for (const item of order.items) {
      result[item.itemNo] = (result[item.itemNo] ?? 0) + item.qty;
    }
  }
  return result;
}
