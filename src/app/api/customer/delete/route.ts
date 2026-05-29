import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomers } from "@/lib/customers-store";
import { createClient } from "@vercel/kv";

function getKV() {
  const url = process.env.gonard_KV_REST_API_URL;
  const token = process.env.gonard_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  try { return createClient({ url, token }); } catch { return null; }
}

export async function DELETE() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) return Response.json({ error: "Not logged in." }, { status: 401 });

  const kv = getKV();
  if (!kv) return Response.json({ error: "Service unavailable." }, { status: 503 });

  const customers = await getCustomers();
  const filtered = customers.filter((c) => c.id !== session.customerId);
  await kv.set("customers_v1", filtered);

  session.destroy();
  return Response.json({ ok: true });
}
