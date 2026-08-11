import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { updateOrder } from "@/lib/orders-store";

async function isAdmin() {
  const session = await getIronSession<AdminSession>(await cookies(), sessionOptions);
  return session.isAdmin === true;
}

// PUT /api/admin/orders/[id]/assign
// Body: { driverId: string | null } — assigns (or clears, via null) which driver
// is responsible for delivering and collecting the signature for this order.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { driverId } = (await req.json()) as { driverId: string | null };

  const updated = await updateOrder(id, { assignedDriverId: driverId ?? undefined });
  if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });
  return Response.json(updated);
}
