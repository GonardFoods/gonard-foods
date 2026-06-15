import { Resend } from "resend";
import type { WebOrder } from "./orders-store";

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Gonard Foods <noreply@gonardfoods.com>";

export async function sendOrderAcceptedEmail(order: WebOrder): Promise<void> {
  const resend = getResend();
  const { customer, items, fulfillment, id } = order;

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:6px 12px 6px 0;font-size:13px;color:#03033f;">${item.name}</td>
          <td style="padding:6px 0;font-size:13px;color:#03033f;text-align:right;">${item.qty} ${item.qty === 1 ? "case" : "cases"}</td>
        </tr>`
    )
    .join("");

  const fulfillmentLine =
    fulfillment === "pickup"
      ? "Your order is scheduled for <strong>pick-up</strong>."
      : "Your order is scheduled for <strong>delivery</strong>.";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#03033f;padding:28px 32px;">
            <p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;">
              GONARD FOODS
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:bold;color:#03033f;">
              Your order has been accepted
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#03033f99;">
              Order #${id.slice(-6).toUpperCase()}
            </p>

            <p style="margin:0 0 20px;font-size:14px;color:#03033f;line-height:1.6;">
              Hi ${customer.name},<br><br>
              We've received your order and confirmed we'll have your products ready.
              ${fulfillmentLine}
            </p>

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0"
              style="border-top:2px solid #03033f14;margin-bottom:20px;">
              <thead>
                <tr style="border-bottom:1px solid #03033f14;">
                  <th style="padding:10px 12px 10px 0;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:left;">Product</th>
                  <th style="padding:10px 0;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:right;">Qty</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <p style="margin:0 0 24px;font-size:13px;color:#03033f88;line-height:1.6;">
              Once we've finalized exact quantities and weights, we'll send you a full invoice with the total.
            </p>

            <p style="margin:0;font-size:13px;color:#03033f88;line-height:1.6;">
              Questions? Reply to this email or call us directly.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #03033f0a;">
            <p style="margin:0;font-size:11px;color:#03033faa;text-align:center;letter-spacing:0.05em;">
              GONARD FOODS &mdash; WHOLESALE MEATS
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: customer.email,
    subject: `Your Gonard Foods order has been accepted — #${id.slice(-6).toUpperCase()}`,
    html,
  });
}

export async function sendInvoiceEmail(order: WebOrder): Promise<void> {
  const resend = getResend();
  const { customer, items, id, invoiceTotal, invoicedAt } = order;

  const dateStr = invoicedAt
    ? new Date(invoicedAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
    : new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

  function fmtMoney(n: number) {
    return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const itemRows = items.map((item) => {
    const isPerBox = item.pricingType === "per_box";
    const isWeightDirect = item.pricingType === "per_weight_direct";
    const qtyCell = isPerBox
      ? `${item.qty} ${item.qty === 1 ? "case" : "cases"}`
      : isWeightDirect
      ? `${item.qty} ${(item.weightUnit ?? "LB").toLowerCase()}`
      : `${item.qty} ${item.qty === 1 ? "case" : "cases"} · ${item.totalWeight ?? "?"} ${(item.weightUnit ?? "KG").toLowerCase()}`;
    const priceCell = item.pricePerUnit != null
      ? `$${item.pricePerUnit}/${isPerBox ? "box" : (item.weightUnit ?? "KG").toLowerCase()}`
      : "—";
    const totalCell = item.lineTotal != null ? fmtMoney(item.lineTotal) : "—";
    return `<tr style="border-bottom:1px solid #03033f08;">
      <td style="padding:8px 12px 8px 0;font-size:13px;color:#03033f;">${item.name}</td>
      <td style="padding:8px 12px;font-size:13px;color:#03033f88;text-align:center;">${qtyCell}</td>
      <td style="padding:8px 12px;font-size:13px;color:#03033f88;text-align:right;">${priceCell}</td>
      <td style="padding:8px 0;font-size:13px;font-weight:bold;color:#03033f;text-align:right;">${totalCell}</td>
    </tr>`;
  }).join("");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#03033f;padding:28px 32px;">
            <p style="margin:0;font-size:18px;font-weight:bold;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;">
              GONARD FOODS
            </p>
            <p style="margin:6px 0 0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#ffffff88;">
              WHOLESALE MEATS &mdash; INVOICE
            </p>
          </td>
        </tr>

        <!-- Invoice meta -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:12px;color:#03033f88;">
                  <strong style="color:#03033f;">Invoice #</strong> ${id.slice(-6).toUpperCase()}<br>
                  <strong style="color:#03033f;">Date</strong> ${dateStr}
                </td>
                <td style="font-size:12px;color:#03033f88;text-align:right;">
                  <strong style="color:#03033f;">Bill To</strong><br>
                  ${customer.name}${customer.company ? `<br>${customer.company}` : ""}<br>
                  ${customer.email}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items -->
        <tr>
          <td style="padding:24px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #03033f14;">
              <thead>
                <tr>
                  <th style="padding:10px 12px 10px 0;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:left;">Product</th>
                  <th style="padding:10px 12px;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:center;">Qty / Weight</th>
                  <th style="padding:10px 12px;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:right;">Price</th>
                  <th style="padding:10px 0;font-size:11px;font-weight:bold;letter-spacing:0.1em;text-transform:uppercase;color:#03033f66;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="padding:16px 32px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:2px solid #03033f14;">
              <tr>
                <td style="padding:14px 0;font-size:14px;font-weight:bold;color:#03033f;">Order Total</td>
                <td style="padding:14px 0;font-size:18px;font-weight:bold;color:#03033f;text-align:right;">
                  ${invoiceTotal != null ? fmtMoney(invoiceTotal) : "—"}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Note -->
        <tr>
          <td style="padding:16px 32px 24px;">
            <p style="margin:0;font-size:12px;color:#03033f88;line-height:1.6;">
              This amount has been added to your account balance. Questions? Reply to this email or call us directly.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #03033f0a;">
            <p style="margin:0;font-size:11px;color:#03033faa;text-align:center;letter-spacing:0.05em;">
              GONARD FOODS &mdash; WHOLESALE MEATS
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to: customer.email,
    subject: `Your Gonard Foods invoice — #${id.slice(-6).toUpperCase()}`,
    html,
  });
}
