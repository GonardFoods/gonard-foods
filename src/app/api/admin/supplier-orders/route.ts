import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getSupplierOrders, saveSupplierOrder, type SupplierOrder, type SupplierOrderItem } from "@/lib/supplier-orders-store";
import { getAllProducts } from "@/lib/products-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await getSupplierOrders();
  return Response.json(orders);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    items?: { productId: string; skids: number; boxes: number; pricePerUnit: number }[];
    approxDeliveryDate?: string;
    notes?: string;
  };

  if (!body.items || body.items.length === 0) {
    return Response.json({ error: "At least one item is required." }, { status: 400 });
  }

  const products = await getAllProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  const items: SupplierOrderItem[] = [];
  for (const raw of body.items) {
    const product = productMap.get(raw.productId);
    if (!product) return Response.json({ error: `Unknown product: ${raw.productId}` }, { status: 400 });
    if (!raw.boxes || raw.boxes <= 0) return Response.json({ error: "Boxes must be greater than 0." }, { status: 400 });
    items.push({
      productId: product.id,
      itemNo: product.itemNo,
      name: product.name,
      skids: raw.skids ?? 0,
      boxes: raw.boxes,
      pricePerUnit: raw.pricePerUnit ?? 0,
      totalPrice: raw.boxes * (raw.pricePerUnit ?? 0),
    });
  }

  const order: SupplierOrder = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    approxDeliveryDate: body.approxDeliveryDate || undefined,
    notes: body.notes || undefined,
    status: "incoming",
    items,
  };

  await saveSupplierOrder(order);
  return Response.json(order, { status: 201 });
}
