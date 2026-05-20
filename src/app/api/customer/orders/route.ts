import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getOrders } from "@/lib/orders-store";

export async function GET() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const all = await getOrders();
  // Show orders linked by customerId OR by matching email (for orders placed before account creation)
  const mine = all.filter(
    (o) => o.customerId === session.customerId || o.customer.email.toLowerCase() === session.customerEmail?.toLowerCase()
  );
  return Response.json(mine);
}
