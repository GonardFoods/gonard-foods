import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getOrders, saveOrder, type WebOrder, type OrderItem, type OrderedUnit } from "@/lib/orders-store";

const VALID_UNITS: OrderedUnit[] = ["KG", "LB", "CASE", "PACKET"];
import { getCustomerById } from "@/lib/customers-store";
import { getAllProducts } from "@/lib/products-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await getOrders();
  return Response.json(orders);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    customerId?: string;
    customerName?: string;
    customerCompany?: string;
    customerEmail?: string;
    customerPhone?: string;
    items?: { productId: string; qty: number; unit?: string }[];
    fulfillment?: string;
    address?: string;
    notes?: string;
  };

  if (!body.items?.length) {
    return Response.json({ error: "At least one item is required." }, { status: 400 });
  }
  if (!body.fulfillment || !["pickup", "delivery"].includes(body.fulfillment)) {
    return Response.json({ error: "Fulfillment method is required." }, { status: 400 });
  }
  if (body.fulfillment === "delivery" && !body.address?.trim()) {
    return Response.json({ error: "Delivery address is required." }, { status: 400 });
  }

  // Resolve customer info
  let customerInfo: WebOrder["customer"];
  let customerId: string | undefined;

  if (body.customerId) {
    const customer = await getCustomerById(body.customerId);
    if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });
    customerInfo = { name: customer.name, company: customer.company, email: customer.email, phone: customer.phone };
    customerId = customer.id;
  } else {
    if (!body.customerName?.trim() || !body.customerEmail?.trim()) {
      return Response.json({ error: "Customer name and email are required." }, { status: 400 });
    }
    customerInfo = {
      name: body.customerName.trim(),
      company: body.customerCompany?.trim() || undefined,
      email: body.customerEmail.trim(),
      phone: body.customerPhone?.trim() || undefined,
    };
  }

  const products = await getAllProducts();
  const productMap = new Map(products.map((p) => [p.id, p]));

  const orderItems: OrderItem[] = [];
  for (const raw of body.items) {
    const product = productMap.get(raw.productId);
    if (!product) return Response.json({ error: `Unknown product: ${raw.productId}` }, { status: 400 });
    if (!raw.qty || raw.qty <= 0) return Response.json({ error: "Quantity must be > 0." }, { status: 400 });
    const unit = raw.unit && VALID_UNITS.includes(raw.unit as OrderedUnit) ? (raw.unit as OrderedUnit) : "CASE";
    orderItems.push({ productId: product.id, itemNo: product.itemNo, name: product.name, qty: raw.qty, orderedUnit: unit });
  }

  const order: WebOrder = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    customerId,
    customer: customerInfo,
    fulfillment: body.fulfillment as "pickup" | "delivery",
    address: body.fulfillment === "delivery" ? body.address!.trim() : undefined,
    items: orderItems,
    notes: body.notes?.trim() || undefined,
    status: "pending",
  };

  await saveOrder(order);
  return Response.json(order, { status: 201 });
}
