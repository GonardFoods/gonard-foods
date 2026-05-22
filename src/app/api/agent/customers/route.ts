import { NextRequest, NextResponse } from "next/server";
import { getCustomers } from "@/lib/customers-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// GET /api/agent/customers
// Returns all customers (without passwordHash) for fuzzy-matching e-transfer senders
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await getCustomers();
  return NextResponse.json(
    customers.map(({ passwordHash: _, ...c }) => c)
  );
}
