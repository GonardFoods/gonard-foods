import { NextRequest, NextResponse } from "next/server";
import { getOrders, updateOrder } from "@/lib/orders-store";
import { sendInvoiceEmail } from "@/lib/email";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// POST /api/agent/orders/[id]/invoice-email
// Sends the Resend invoice email to the customer and marks invoiceEmailSent = true
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await sendInvoiceEmail(order);

  const updated = await updateOrder(id, { invoiceEmailSent: true });
  return NextResponse.json(updated);
}
