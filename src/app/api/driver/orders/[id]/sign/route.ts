import { put } from "@vercel/blob";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { driverSessionOptions, type DriverSession } from "@/lib/session";
import { getOrders, updateOrder } from "@/lib/orders-store";

async function isDriver() {
  const session = await getIronSession<DriverSession>(await cookies(), driverSessionOptions);
  return session.isDriver === true;
}

function getBlobToken(): string | undefined {
  return process.env.PUBLIC_BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN;
}

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024; // 2MB — a signature PNG is normally a few KB

// POST /api/driver/orders/[id]/sign
// Body: { signatureDataUrl: "data:image/png;base64,...", signedByName?: string }
// Uploads the signature, records proof of delivery, and marks the order fulfilled.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isDriver())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await req.json() as { signatureDataUrl?: string; signedByName?: string };
  const dataUrl = body.signatureDataUrl;
  const match = dataUrl?.match(/^data:image\/png;base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "A signature is required." }, { status: 400 });
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === id);
  if (!order || order.status !== "invoiced" || order.fulfillment !== "delivery") {
    return Response.json({ error: "Order is not awaiting a delivery signature." }, { status: 400 });
  }

  const bytes = Buffer.from(match[1], "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIGNATURE_BYTES) {
    return Response.json({ error: "Signature image is invalid or too large." }, { status: 400 });
  }

  let signatureUrl: string;
  try {
    const blob = await put(`signatures/${id}-${Date.now()}.png`, bytes, {
      access: "public",
      contentType: "image/png",
      token: getBlobToken(),
    });
    signatureUrl = blob.url;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: `Could not save signature: ${msg}` }, { status: 500 });
  }

  const now = new Date().toISOString();
  const updated = await updateOrder(id, {
    status: "fulfilled",
    fulfilledAt: now,
    proofOfDelivery: {
      signatureUrl,
      signedAt: now,
      signedByName: body.signedByName?.trim() || undefined,
    },
  });

  return Response.json(updated);
}
