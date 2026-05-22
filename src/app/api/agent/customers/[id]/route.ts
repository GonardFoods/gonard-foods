import { NextRequest, NextResponse } from "next/server";
import { updateCustomer } from "@/lib/customers-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// PATCH /api/agent/customers/[id]
// Body: { balance: number } — used by agent to update outstanding balance
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json();
  const updated = await updateCustomer(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { passwordHash: _, ...safe } = updated;
  return NextResponse.json(safe);
}
