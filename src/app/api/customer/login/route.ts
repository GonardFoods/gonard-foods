import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerByEmail, verifyPassword } from "@/lib/customers-store";

export async function POST(req: Request) {
  const { email, password } = await req.json() as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }
  const customer = await getCustomerByEmail(email.trim());
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  session.customerId = customer.id;
  session.customerName = customer.name;
  session.customerEmail = customer.email;
  await session.save();
  return Response.json({ ok: true, name: customer.name });
}
