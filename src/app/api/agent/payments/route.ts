import { NextRequest, NextResponse } from "next/server";
import { getPayments, savePayment } from "@/lib/payments-store";
import { updateCustomer, getCustomerById } from "@/lib/customers-store";
import { randomUUID } from "crypto";

function auth(req: NextRequest) {
  const key = req.headers.get("x-agent-key");
  return key === process.env.SAGE_AGENT_KEY && !!key;
}

// GET /api/agent/payments?unsynced=true
export async function GET(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const unsynced = req.nextUrl.searchParams.get("unsynced") === "true";
  const payments = await getPayments();
  const result = unsynced ? payments.filter((p) => !p.sageSynced) : payments;
  return NextResponse.json(result);
}

// POST /api/agent/payments
// Body: { customerId?, customerName, amount, receivedAt, source, note? }
// If customerId provided and customer exists, reduces their balance automatically.
export async function POST(req: NextRequest) {
  if (!auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  let balanceBefore: number | undefined;
  let balanceAfter: number | undefined;

  if (body.customerId) {
    const customer = await getCustomerById(body.customerId);
    if (customer) {
      balanceBefore = customer.balance;
      balanceAfter = Math.max(0, customer.balance - body.amount);
      await updateCustomer(body.customerId, { balance: balanceAfter });
    }
  }

  const payment = {
    id: randomUUID(),
    customerId: body.customerId ?? null,
    customerName: body.customerName,
    amount: body.amount,
    receivedAt: body.receivedAt ?? new Date().toISOString(),
    source: body.source ?? "email_auto",
    note: body.note,
    sageSynced: false,
    balanceBefore,
    balanceAfter,
  };

  await savePayment(payment as Parameters<typeof savePayment>[0]);
  return NextResponse.json(payment, { status: 201 });
}
