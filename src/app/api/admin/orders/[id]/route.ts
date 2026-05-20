import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { updateOrder, type OrderStatus } from "@/lib/orders-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json() as { status?: OrderStatus };
  if (!status || !["pending", "fulfilled", "cancelled"].includes(status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  const patch: { status: OrderStatus; fulfilledAt?: string } = { status };
  if (status === "fulfilled") patch.fulfilledAt = new Date().toISOString();
  const updated = await updateOrder(id, patch);
  if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });
  return Response.json(updated);
}
