import { NextRequest, NextResponse } from "next/server";
import { getOrders } from "@/lib/orders-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// GET /api/agent/orders?unsynced=true
// Returns invoiced orders not yet synced to Sage, or all if unsynced omitted
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unsynced = req.nextUrl.searchParams.get("unsynced") === "true";
  const orders = await getOrders();
  const result = unsynced
    ? orders.filter((o) => o.status === "invoiced" && !o.sageSynced)
    : orders;
  return NextResponse.json(result);
}
