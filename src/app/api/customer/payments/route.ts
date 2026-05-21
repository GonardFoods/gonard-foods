import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getPaymentsByCustomer } from "@/lib/payments-store";

export async function GET() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payments = await getPaymentsByCustomer(session.customerId);
  return Response.json(payments);
}
