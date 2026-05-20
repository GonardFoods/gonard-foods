import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { getCustomers, createCustomer, getCustomerByEmail, hashPassword, type Customer } from "@/lib/customers-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function GET() {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const customers = await getCustomers();
  return Response.json(customers.map(({ passwordHash: _, ...c }) => c));
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json() as {
    name?: string; company?: string; email?: string; phone?: string;
    password?: string; notes?: string; balance?: number;
  };
  if (!body.name?.trim() || !body.email?.trim()) {
    return Response.json({ error: "Name and email are required." }, { status: 400 });
  }
  const existing = await getCustomerByEmail(body.email.trim());
  if (existing) return Response.json({ error: "A customer with this email already exists." }, { status: 409 });

  const passwordHash = await hashPassword(body.password?.trim() || crypto.randomUUID());
  const customer: Customer = {
    id: Date.now().toString(),
    name: body.name.trim(),
    company: body.company?.trim() || undefined,
    email: body.email.trim().toLowerCase(),
    phone: body.phone?.trim() || undefined,
    passwordHash,
    createdAt: new Date().toISOString(),
    notes: body.notes?.trim() || undefined,
    balance: body.balance ?? 0,
  };
  await createCustomer(customer);
  const { passwordHash: _, ...pub } = customer;
  return Response.json(pub, { status: 201 });
}
