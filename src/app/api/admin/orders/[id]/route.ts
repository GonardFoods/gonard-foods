import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { sessionOptions, type AdminSession } from "@/lib/session";
import { updateOrder, type OrderStatus, type OrderItem } from "@/lib/orders-store";
import { sendOrderAcceptedEmail } from "@/lib/email";

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
  const body = await req.json() as {
    status?: OrderStatus;
    items?: OrderItem[];
    invoiceTotal?: number;
  };

  const validStatuses: OrderStatus[] = ["pending", "accepted", "invoiced", "fulfilled", "cancelled", "archived"];

  // Finalize (invoiced) — full patch with items + total
  if (body.status === "invoiced") {
    if (!body.items || !body.invoiceTotal) {
      return Response.json({ error: "items and invoiceTotal required for invoiced status." }, { status: 400 });
    }
    const now = new Date().toISOString();
    const updated = await updateOrder(id, {
      status: "invoiced",
      items: body.items,
      invoiceTotal: body.invoiceTotal,
      invoicedAt: now,
      sageSynced: false,
    });
    if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });
    return Response.json(updated);
  }

  // Normal status transitions
  const { status } = body;
  if (!status || !validStatuses.includes(status)) {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  const now = new Date().toISOString();
  const patch: {
    status: OrderStatus;
    acceptedAt?: string;
    fulfilledAt?: string;
    archivedAt?: string;
  } = { status };
  if (status === "accepted") patch.acceptedAt = now;
  if (status === "fulfilled") patch.fulfilledAt = now;
  if (status === "archived") patch.archivedAt = now;

  const updated = await updateOrder(id, patch);
  if (!updated) return Response.json({ error: "Order not found." }, { status: 404 });

  if (status === "accepted") {
    // Fire-and-forget — don't fail the response if email errors
    sendOrderAcceptedEmail(updated).catch((err) =>
      console.error(`Failed to send accepted email for order ${id}:`, err)
    );
  }

  return Response.json(updated);
}
