import { NextRequest, NextResponse } from "next/server";
import { getOrders, isDelivered } from "@/lib/orders-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// GET /api/agent/orders?unsynced=true
// GET /api/agent/orders?needsInvoiceEmail=true  — delivered + sageSynced + invoiceEmailSent not set
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = req.nextUrl.searchParams;
  const orders = await getOrders();

  if (params.get("needsInvoiceEmail") === "true") {
    // isDelivered (fulfilled or archived), not status === "fulfilled" alone —
    // an order archived before its invoice email ever went out must still be
    // found here, same reasoning as the unsynced-orders query below.
    return NextResponse.json(
      orders.filter((o) => isDelivered(o.status) && o.sageSynced && !o.invoiceEmailSent)
    );
  }

  // Any order that's been finalized (has a price) but never pushed to Sage —
  // NOT gated on status === "invoiced" specifically. An order keeps moving
  // through its lifecycle (invoiced -> fulfilled -> archived) independent of
  // whether the Sage agent has actually run; if it advances past "invoiced"
  // before the agent gets to it (e.g. the agent was down), it must still be
  // found here, not silently skipped forever.
  const unsynced = params.get("unsynced") === "true";
  const result = unsynced
    ? orders.filter((o) => o.invoiceTotal != null && !o.sageSynced && o.status !== "cancelled")
    : orders;
  return NextResponse.json(result);
}
