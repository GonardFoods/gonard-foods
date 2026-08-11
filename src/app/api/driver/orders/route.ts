import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getOrders } from "@/lib/orders-store";

async function isDriver() {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  return session.isDriver === true;
}

// Orders ready for a driver to deliver and get signed for: invoiced, out for
// delivery (not pickup — those don't need a signature), not yet fulfilled.
export async function GET() {
  if (!(await isDriver())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await getOrders();
  const ready = orders
    .filter((o) => o.status === "invoiced" && o.fulfillment === "delivery")
    .sort((a, b) => new Date(a.invoicedAt ?? a.createdAt).getTime() - new Date(b.invoicedAt ?? b.createdAt).getTime());
  return Response.json(ready);
}
