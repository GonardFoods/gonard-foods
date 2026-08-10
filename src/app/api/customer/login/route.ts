import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerByEmail, verifyPassword, isLegacyHash, hashPassword, updateCustomer } from "@/lib/customers-store";
import { checkRateLimit, getIP } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const { allowed } = await checkRateLimit(getIP(req), "customer-login", { limit: 5, windowSec: 900 });
  if (!allowed) {
    return Response.json({ error: "Too many login attempts. Please try again in 15 minutes." }, { status: 429 });
  }

  const { email, password } = await req.json() as { email?: string; password?: string };
  if (!email?.trim() || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }
  const customer = await getCustomerByEmail(email.trim());
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  // Transparently upgrade older, weaker password hashes on successful login —
  // no forced reset needed, and it self-heals the whole customer base over time.
  if (isLegacyHash(customer.passwordHash)) {
    await updateCustomer(customer.id, { passwordHash: await hashPassword(password) });
  }

  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  session.customerId = customer.id;
  session.customerName = customer.name;
  session.customerEmail = customer.email;
  await session.save();
  return Response.json({ ok: true, name: customer.name });
}
