import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getInventory } from "@/lib/inventory-store";
import { getOrders, pendingByItemNo } from "@/lib/orders-store";
import { getAllProducts } from "@/lib/products-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const [inventory, orders, products] = await Promise.all([
    getInventory(),
    getOrders(),
    getAllProducts(),
  ]);

  const pending = pendingByItemNo(orders);

  // Build a combined view: all products that have a stock level set,
  // plus any itemNos in pending orders that aren't yet in inventory.
  const allItemNos = new Set([
    ...Object.keys(inventory),
    ...Object.keys(pending),
  ]);

  const productByItemNo = new Map(products.map((p) => [p.itemNo, p]));

  const rows = Array.from(allItemNos).map((itemNo) => {
    const stock = inventory[itemNo];
    const product = productByItemNo.get(itemNo);
    return {
      itemNo,
      productId: product?.id ?? null,
      name: product?.name ?? `Item ${itemNo}`,
      category: product?.category ?? null,
      onHand: stock?.onHand ?? null,
      updatedAt: stock?.updatedAt ?? null,
      pendingCases: pending[itemNo] ?? 0,
      available: stock != null ? Math.max(0, stock.onHand - (pending[itemNo] ?? 0)) : null,
    };
  });

  rows.sort((a, b) => {
    if (a.category && b.category && a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return Response.json({
    rows,
    lastImportAt: Object.values(inventory).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    )[0]?.updatedAt ?? null,
  });
}
