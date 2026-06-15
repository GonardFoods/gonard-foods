import { NextRequest, NextResponse } from "next/server";
import { updateOrder } from "@/lib/orders-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// PATCH /api/agent/orders/[id]
// Body: { sageSynced: true } | { invoiceEmailSent: true }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json() as { sageSynced?: boolean; invoiceEmailSent?: boolean };
  const patch: { sageSynced?: boolean; invoiceEmailSent?: boolean } = {};
  if (body.sageSynced !== undefined) patch.sageSynced = body.sageSynced;
  if (body.invoiceEmailSent !== undefined) patch.invoiceEmailSent = body.invoiceEmailSent;
  const updated = await updateOrder(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
