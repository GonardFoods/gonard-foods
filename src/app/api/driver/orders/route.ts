import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getOrders } from "@/lib/orders-store";

async function getSession() {
  return getIronSession<DriverSession>(await cookies(), driverSessionOptions);
}

// Orders ready for THIS driver to deliver and get signed for: invoiced, out for
// delivery (not pickup — those don't need a signature), assigned to them by admin,
// not yet fulfilled.
export async function GET() {
  const session = await getSession();
  if (!session.isDriver) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.selectedDriverId) return Response.json({ error: "No driver selected." }, { status: 400 });

  const orders = await getOrders();
  const ready = orders
    .filter((o) => o.status === "invoiced" && o.fulfillment === "delivery" && o.assignedDriverId === session.selectedDriverId)
    .sort((a, b) => new Date(a.invoicedAt ?? a.createdAt).getTime() - new Date(b.invoicedAt ?? b.createdAt).getTime());
  return Response.json(ready);
}
