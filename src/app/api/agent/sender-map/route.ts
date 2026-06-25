import { NextRequest, NextResponse } from "next/server";
import { getSenderMap, type SenderMap } from "@/lib/sender-map-store";
import { getPayments } from "@/lib/payments-store";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Build a map from all manually-assigned payments so that assignments made
  // before the sender-map feature existed are automatically included.
  // Payments are stored newest-first, so the first match for each sender is
  // the most recent assignment — which is what we want.
  const payments = await getPayments();
  const derived: SenderMap = {};
  for (const p of payments) {
    if (p.source !== "manual" && p.source !== "manual_sage") continue;
    const match = p.note?.match(/sender:\s*'(.+?)'/);
    if (!match) continue;
    const key = match[1].toLowerCase().trim();
    if (!derived[key]) {
      derived[key] = { customerId: p.customerId, customerName: p.customerName };
    }
  }

  // Explicitly stored entries (written on new assignments) take priority
  const stored = await getSenderMap();
  return NextResponse.json({ ...derived, ...stored });
}
