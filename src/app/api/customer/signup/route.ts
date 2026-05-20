import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerByEmail, createCustomer, hashPassword, type Customer } from "@/lib/customers-store";

export async function POST(req: Request) {
  const body = await req.json() as {
    name?: string; company?: string; email?: string;
    phone?: string; password?: string;
  };

  if (!body.name?.trim()) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!body.email?.trim()) return Response.json({ error: "Email is required." }, { status: 400 });
  if (!body.phone?.trim()) return Response.json({ error: "Phone number is required." }, { status: 400 });
  if (!body.password || body.password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const existing = await getCustomerByEmail(body.email.trim());
  if (existing) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

  const customer: Customer = {
    id: Date.now().toString(),
    name: body.name.trim(),
    company: body.company?.trim() || undefined,
    email: body.email.trim().toLowerCase(),
    phone: body.phone.trim(),
    passwordHash: await hashPassword(body.password),
    createdAt: new Date().toISOString(),
    balance: 0,
  };

  await createCustomer(customer);

  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  session.customerId = customer.id;
  session.customerName = customer.name;
  session.customerEmail = customer.email;
  await session.save();

  const { passwordHash: _, ...pub } = customer;
  return Response.json(pub, { status: 201 });
}
