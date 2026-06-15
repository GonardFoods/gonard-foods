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
