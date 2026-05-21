import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getPayments, savePayment, type Payment } from "@/lib/payments-store";
import { getCustomerById, updateCustomer } from "@/lib/customers-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payments = await getPayments();
  return Response.json(payments);
}

// Record a manual payment and reduce customer balance
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { customerId, amount, note } = await req.json() as {
    customerId: string;
    amount: number;
    note?: string;
  };

  if (!customerId || !amount || amount <= 0) {
    return Response.json({ error: "customerId and positive amount required." }, { status: 400 });
  }

  const customer = await getCustomerById(customerId);
  if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });

  const balanceBefore = customer.balance;
  const balanceAfter = Math.max(0, balanceBefore - amount);

  await updateCustomer(customerId, { balance: balanceAfter });

  const payment: Payment = {
    id: Date.now().toString(),
    customerId,
    customerName: customer.name,
    amount,
    receivedAt: new Date().toISOString(),
    source: "manual",
    note,
    sageSynced: false,
    balanceBefore,
    balanceAfter,
  };

  await savePayment(payment);
  return Response.json(payment);
}
