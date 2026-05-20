import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customers-store";

export async function GET() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) return Response.json({ customer: null });
  const customer = await getCustomerById(session.customerId);
  if (!customer) return Response.json({ customer: null });
  const { passwordHash: _, ...pub } = customer;
  return Response.json({ customer: pub });
}
