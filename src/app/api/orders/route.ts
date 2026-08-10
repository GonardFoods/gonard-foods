import { Resend } from "resend";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { saveOrder, type WebOrder, type OrderItem } from "@/lib/orders-store";
import { getAllProducts } from "@/lib/products-store";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Gonard Foods Website <noreply@gonardfoods.com>";
const NOTIFY_TO = "gfoods@telus.net";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      customer?: { name?: string; company?: string; email?: string; phone?: string };
      fulfillment?: string;
      address?: string;
      items?: { productId: string; name: string; qty: number }[];
      notes?: string;
    };

    const { customer, fulfillment, address, items, notes } = body;

    if (!customer?.name?.trim() || !customer?.email?.trim()) {
      return Response.json({ error: "Name and email are required." }, { status: 400 });
    }
    if (!customer?.phone?.trim()) {
      return Response.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!fulfillment || !["pickup", "delivery"].includes(fulfillment)) {
      return Response.json({ error: "Fulfillment method is required." }, { status: 400 });
    }
    if (fulfillment === "delivery" && !address?.trim()) {
      return Response.json({ error: "Delivery address is required." }, { status: 400 });
    }
    if (!items?.length) {
      return Response.json({ error: "Order must contain at least one item." }, { status: 400 });
    }

    // Attach customerId if a customer is logged in
    const customerSession = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
    const customerId = customerSession.customerId || undefined;

    const products = await getAllProducts();
    const productMap = new Map(products.map((p) => [p.id, p]));

    const orderItems: OrderItem[] = items.map((i) => ({
      productId: i.productId,
      itemNo: productMap.get(i.productId)?.itemNo ?? i.productId,
      // Trust the catalog name, not whatever the client sent — item.name ends up
      // rendered unescaped-adjacent in admin views and interpolated into HTML
      // emails, so it must not be arbitrary client-controlled text.
      name: productMap.get(i.productId)?.name ?? i.name,
      qty: i.qty,
    }));

    const order: WebOrder = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      customerId,
      customer: {
        name: customer.name.trim(),
        company: customer.company?.trim() || undefined,
        email: customer.email.trim(),
        phone: customer.phone.trim(),
      },
      fulfillment: fulfillment as "pickup" | "delivery",
      address: fulfillment === "delivery" ? address!.trim() : undefined,
      items: orderItems,
      notes: notes?.trim() || undefined,
      status: "pending",
    };

    await saveOrder(order);

    const itemRows = orderItems
      .map((i) => `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb">${esc(i.itemNo)}</td><td style="padding:4px 8px;border:1px solid #e5e7eb">${esc(i.name)}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center">${i.qty}</td></tr>`)
      .join("");

    const itemText = orderItems
      .map((i) => `  ${i.itemNo}  ${i.name}  ×${i.qty} cases`)
      .join("\n");

    const fulfillmentLabel = order.fulfillment === "delivery"
      ? `Delivery — ${esc(order.address!)}`
      : "Pick-Up";

    // Notification to Gonard Foods
    await resend.emails.send({
      from: FROM,
      to: NOTIFY_TO,
      replyTo: order.customer.email,
      subject: `New Order #${order.id} — ${order.customer.name}${order.customer.company ? ` (${order.customer.company})` : ""}`,
      html: `
        <h2 style="font-family:sans-serif">New Website Order</h2>
        <p style="font-family:sans-serif"><strong>Order ID:</strong> ${esc(order.id)}</p>
        <p style="font-family:sans-serif"><strong>Name:</strong> ${esc(order.customer.name)}</p>
        ${order.customer.company ? `<p style="font-family:sans-serif"><strong>Company:</strong> ${esc(order.customer.company)}</p>` : ""}
        <p style="font-family:sans-serif"><strong>Email:</strong> <a href="mailto:${esc(order.customer.email)}">${esc(order.customer.email)}</a></p>
        <p style="font-family:sans-serif"><strong>Phone:</strong> ${esc(order.customer.phone!)}</p>
        <p style="font-family:sans-serif"><strong>Fulfillment:</strong> ${fulfillmentLabel}</p>
        ${order.notes ? `<p style="font-family:sans-serif"><strong>Notes:</strong> ${esc(order.notes)}</p>` : ""}
        <table style="border-collapse:collapse;margin-top:12px;font-family:sans-serif;font-size:14px">
          <thead><tr>
            <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Item No</th>
            <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Product</th>
            <th style="padding:4px 8px;border:1px solid #e5e7eb">Cases</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
      `,
      text: `New Website Order #${order.id}\n\nName: ${order.customer.name}\n${order.customer.company ? `Company: ${order.customer.company}\n` : ""}Email: ${order.customer.email}\nPhone: ${order.customer.phone}\nFulfillment: ${order.fulfillment === "delivery" ? `Delivery — ${order.address}` : "Pick-Up"}\n${order.notes ? `Notes: ${order.notes}\n` : ""}\nItems:\n${itemText}`,
    });

    // Confirmation to customer
    await resend.emails.send({
      from: FROM,
      to: order.customer.email,
      subject: `Your order inquiry has been received — Gonard Foods`,
      html: `
        <p style="font-family:sans-serif">Hi ${esc(order.customer.name)},</p>
        <p style="font-family:sans-serif">Thank you for your order inquiry. We have received your request and will be in touch shortly to confirm availability and pricing.</p>
        <p style="font-family:sans-serif"><strong>Order Reference:</strong> #${esc(order.id)}</p>
        <p style="font-family:sans-serif"><strong>Fulfillment:</strong> ${fulfillmentLabel}</p>
        <table style="border-collapse:collapse;margin-top:12px;font-family:sans-serif;font-size:14px">
          <thead><tr>
            <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left">Product</th>
            <th style="padding:4px 8px;border:1px solid #e5e7eb">Cases</th>
          </tr></thead>
          <tbody>${orderItems.map((i) => `<tr><td style="padding:4px 8px;border:1px solid #e5e7eb">${esc(i.name)}</td><td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center">${i.qty}</td></tr>`).join("")}</tbody>
        </table>
        ${order.notes ? `<p style="font-family:sans-serif"><strong>Your notes:</strong> ${esc(order.notes)}</p>` : ""}
        <p style="font-family:sans-serif">If you have any questions, reply to this email or call us at (403) 277-0991.</p>
        <p style="font-family:sans-serif">— Gonard Foods</p>
      `,
      text: `Hi ${order.customer.name},\n\nThank you for your order inquiry (Ref: #${order.id}). We will be in touch shortly.\n\nFulfillment: ${order.fulfillment === "delivery" ? `Delivery — ${order.address}` : "Pick-Up"}\n\nItems:\n${itemText}\n\nQuestions? Call (403) 277-0991 or reply to this email.\n\n— Gonard Foods`,
    });

    return Response.json({ ok: true, orderId: order.id });
  } catch (e) {
    console.error("Order submission error:", e);
    return Response.json({ error: "Failed to submit order. Please try again." }, { status: 500 });
  }
}
