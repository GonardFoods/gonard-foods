import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getSupplierOrders, incomingByItemNo, receivedByItemNo } from "@/lib/supplier-orders-store";
import { getOrders } from "@/lib/orders-store";
import { getAllProducts } from "@/lib/products-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [supplierOrders, customerOrders, products] = await Promise.all([
    getSupplierOrders(),
    getOrders(),
    getAllProducts(),
  ]);

  const incoming = incomingByItemNo(supplierOrders);
  const received = receivedByItemNo(supplierOrders);

  // Boxes shipped out to customers (fulfilled or archived orders)
  const shipped: Record<string, number> = {};
  for (const order of customerOrders) {
    if (order.status !== "fulfilled" && order.status !== "archived") continue;
    for (const item of order.items) {
      shipped[item.itemNo] = (shipped[item.itemNo] ?? 0) + item.qty;
    }
  }

  // Boxes committed to pending customer orders
  const reserved: Record<string, number> = {};
  for (const order of customerOrders) {
    if (order.status !== "pending") continue;
    for (const item of order.items) {
      reserved[item.itemNo] = (reserved[item.itemNo] ?? 0) + item.qty;
    }
  }

  const allItemNos = new Set([
    ...products.map((p) => p.itemNo),
    ...Object.keys(incoming),
    ...Object.keys(received),
    ...Object.keys(reserved),
    ...Object.keys(shipped),
  ]);

  const productByItemNo = new Map(products.map((p) => [p.itemNo, p]));

  const rows = Array.from(allItemNos).map((itemNo) => {
    const product = productByItemNo.get(itemNo);
    const inHouse = Math.max(0, (received[itemNo] ?? 0) - (shipped[itemNo] ?? 0));
    const onTheWay = incoming[itemNo] ?? 0;
    const res = reserved[itemNo] ?? 0;
    const available = Math.max(0, inHouse - res);
    return {
      itemNo,
      productId: product?.id ?? null,
      name: product?.name ?? `Item ${itemNo}`,
      category: product?.category ?? null,
      inHouse,
      onTheWay,
      reserved: res,
      available,
    };
  });

  rows.sort((a, b) => {
    if (a.category && b.category && a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return Response.json({ rows });
}
