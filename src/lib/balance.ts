import { getOrders } from "@/lib/orders-store";
import { getPaymentsByCustomer } from "@/lib/payments-store";
import type { Customer } from "@/lib/customers-store";

// Outstanding balance = total invoiced on delivered orders minus total payments received.
// Single source of truth — the account page and the Stripe balance-payment route must
// agree on this number, or a customer could be quoted one amount and see another.
export async function getOutstandingBalance(customer: Customer): Promise<number> {
  const allOrders = await getOrders();
  const myOrders = allOrders.filter(
    (o) =>
      (o.customerId === customer.id || o.customer.email.toLowerCase() === customer.email.toLowerCase()) &&
      o.status !== "cancelled"
  );
  const totalInvoiced = myOrders
    .filter((o) => o.status === "fulfilled")
    .reduce((sum, o) => sum + (o.invoiceTotal ?? 0), 0);
  const payments = await getPaymentsByCustomer(customer.id);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, totalInvoiced - totalPaid);
}
