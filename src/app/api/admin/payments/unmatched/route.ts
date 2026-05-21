import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getPayments, updatePayment, savePayment } from "@/lib/payments-store";
import { getCustomerById, updateCustomer } from "@/lib/customers-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// List unmatched payments (source === "email_unmatched")
export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const all = await getPayments();
  return Response.json(all.filter((p) => p.source === "email_unmatched"));
}

// Assign an unmatched payment to a customer
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { paymentId, customerId } = await req.json() as { paymentId: string; customerId: string };
  if (!paymentId || !customerId) {
    return Response.json({ error: "paymentId and customerId required." }, { status: 400 });
  }

  const all = await getPayments();
  const payment = all.find((p) => p.id === paymentId);
  if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });

  const customer = await getCustomerById(customerId);
  if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });

  const balanceBefore = customer.balance;
  const balanceAfter = Math.max(0, balanceBefore - payment.amount);
  await updateCustomer(customerId, { balance: balanceAfter });

  const updated = await updatePayment(paymentId, {
    customerId,
    customerName: customer.name,
    source: "manual",
    sageSynced: false,
    balanceBefore,
    balanceAfter,
  });

  return Response.json(updated);
}
