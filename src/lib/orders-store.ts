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
  pricingType?: "per_weight" | "per_box" | "per_weight_direct";
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

export type OrderStatus = "pending" | "accepted" | "invoiced" | "fulfilled" | "cancelled" | "archived";

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
  acceptedAt?: string;
  invoicedAt?: string;
  fulfilledAt?: string;
  archivedAt?: string;
  sageSynced?: boolean;
  invoiceEmailSent?: boolean;
  stripePaid?: boolean;          // this specific order was paid in full via Stripe
  stripePaidAt?: string;         // ISO
  stripeAmountCharged?: number;  // invoiceTotal + surcharge, what the card was actually charged
  stripeSessionId?: string;
}

// "fulfilled" and "archived" both mean the order was delivered — archiving is
// just an admin workflow/decluttering step, not a payment or delivery state.
// Anything comparing invoiced-vs-paid amounts must treat them identically, or
// archiving an order silently drops its invoice total while its payment stays
// counted, understating the customer's balance from then on.
export function isDelivered(status: OrderStatus): boolean {
  return status === "fulfilled" || status === "archived";
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
    if (order.status !== "pending" && order.status !== "accepted" && order.status !== "invoiced") continue;
    for (const item of order.items) {
      result[item.itemNo] = (result[item.itemNo] ?? 0) + item.qty;
    }
  }
  return result;
}
