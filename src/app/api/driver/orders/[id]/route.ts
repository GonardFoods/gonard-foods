import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getOrders } from "@/lib/orders-store";

async function getSession() {
  return getIronSession<DriverSession>(await cookies(), driverSessionOptions);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session.isDriver) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (
    !order ||
    order.status !== "invoiced" ||
    order.fulfillment !== "delivery" ||
    order.assignedDriverId !== session.selectedDriverId
  ) {
    // Same 404 whether the order doesn't exist or just isn't this driver's —
    // don't reveal that another driver's order exists.
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(order);
}
