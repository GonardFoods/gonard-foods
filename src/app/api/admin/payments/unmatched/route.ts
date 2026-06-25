import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getPayments, updatePayment } from "@/lib/payments-store";
import { getCustomerById, updateCustomer } from "@/lib/customers-store";
import { recordSenderMapping } from "@/lib/sender-map-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const all = await getPayments();
  return Response.json(all.filter((p) => p.source === "email_unmatched"));
}

// Assign an unmatched payment to either a web-app customer or a Sage-only customer.
//
// Web-app customer: { paymentId, customerId }
//   — updates customer balance and queues a Sage receipt
//
// Sage-only customer: { paymentId, sageCustomerName }
//   — no balance change (no web account); Sage receipt is still posted by agent
export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    paymentId: string;
    customerId?: string;
    sageCustomerName?: string;
  };

  if (!body.paymentId) return Response.json({ error: "paymentId required." }, { status: 400 });
  if (!body.customerId && !body.sageCustomerName) {
    return Response.json({ error: "customerId or sageCustomerName required." }, { status: 400 });
  }

  const all = await getPayments();
  const payment = all.find((p) => p.id === body.paymentId);
  if (!payment) return Response.json({ error: "Payment not found." }, { status: 404 });

  // The sender name (from the original e-transfer) is stored in payment.customerName
  // while the payment is unmatched. Persist this mapping so future emails from the
  // same sender are auto-matched without ever hitting the unmatched queue again.
  const senderName = payment.customerName;

  if (body.customerId) {
    const customer = await getCustomerById(body.customerId);
    if (!customer) return Response.json({ error: "Customer not found." }, { status: 404 });

    const balanceBefore = customer.balance;
    const balanceAfter = Math.max(0, balanceBefore - payment.amount);
    await updateCustomer(body.customerId, { balance: balanceAfter });

    const updated = await updatePayment(body.paymentId, {
      customerId: body.customerId,
      customerName: customer.name,
      source: "manual",
      sageSynced: false,
      balanceBefore,
      balanceAfter,
    });

    await recordSenderMapping(senderName, { customerId: body.customerId, customerName: customer.name });
    return Response.json(updated);
  } else {
    // Sage-only: no web account, so no balance update. Agent will post the Sage receipt.
    const updated = await updatePayment(body.paymentId, {
      customerId: null,
      customerName: body.sageCustomerName,
      source: "manual_sage",
      sageSynced: false,
    });

    await recordSenderMapping(senderName, { customerId: null, customerName: body.sageCustomerName! });
    return Response.json(updated);
  }
}
