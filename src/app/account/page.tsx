import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import Link from "next/link";
import DeleteAccountButton from "./DeleteAccountButton";
import { PayButton } from "./PayModal";
import { customerSessionOptions, type CustomerSession } from "@/lib/customer-session";
import { getCustomerById } from "@/lib/customers-store";
import { getOrders, isDelivered } from "@/lib/orders-store";
import { getPaymentsByCustomer } from "@/lib/payments-store";
import { getOutstandingBalance } from "@/lib/balance";

const STATUS_LABELS: Record<string, string> = {
  pending:   "Pending",
  invoiced:  "Invoiced",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
  archived:  "Delivered",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: "#fef9c3", text: "#854d0e" },
  invoiced:  { bg: "#dbeafe", text: "#1e40af" },
  fulfilled: { bg: "#dcfce7", text: "#166534" },
  cancelled: { bg: "#fee2e2", text: "#991b1b" },
  archived:  { bg: "#dcfce7", text: "#166534" },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AccountPage() {
  const session = await getIronSession<CustomerSession>(await cookies(), customerSessionOptions);
  if (!session.customerId) redirect("/account/login");

  const customer = await getCustomerById(session.customerId);
  if (!customer) redirect("/account/login");

  const allOrders = await getOrders();
  const myOrders = allOrders
    .filter((o) => o.customerId === customer.id || o.customer.email.toLowerCase() === customer.email.toLowerCase())
    .filter((o) => o.status !== "cancelled")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const payments = await getPaymentsByCustomer(customer.id);
  const outstandingBalance = await getOutstandingBalance(customer);

  const { passwordHash: _, ...pub } = customer;

  return (
    <>
      <section
        className="py-16 px-6"
        style={{ backgroundColor: "#03033f", backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px" }}
      >
        <div className="max-w-5xl mx-auto">
          <p className="text-white/50 text-xs tracking-[0.35em] uppercase mb-2" style={{ fontFamily: "var(--font-brand), sans-serif" }}>Customer Portal</p>
          <h1 className="text-white text-3xl font-bold tracking-[0.1em] uppercase" style={{ fontFamily: "var(--font-brand), sans-serif" }}>
            Welcome, {pub.name}
          </h1>
          {pub.company && <p className="text-white/60 text-sm mt-1">{pub.company}</p>}
          <div className="w-10 h-0.5 bg-white/30 mt-4" />
        </div>
      </section>

      <section className="py-10 px-6 bg-white">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">

          {/* Balance */}
          {outstandingBalance > 0 ? (
            <div className="p-5 flex items-center justify-between gap-6" style={{ backgroundColor: "#fef9c3", border: "1px solid #fde68a" }}>
              <div>
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#854d0e", fontFamily: "var(--font-brand), sans-serif" }}>Outstanding Balance</p>
                <p className="text-3xl font-bold mt-1" style={{ color: "#854d0e", fontFamily: "var(--font-brand), sans-serif" }}>
                  {fmtMoney(outstandingBalance)}
                </p>
                <p className="text-xs mt-2" style={{ color: "#92400e" }}>
                  From {myOrders.filter((o) => isDelivered(o.status)).length === 1 ? "1 delivered order" : `${myOrders.filter((o) => isDelivered(o.status)).length} delivered orders`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <PayButton amount={outstandingBalance} />
                <a
                  href="/api/account/pay"
                  className="text-xs font-bold tracking-widest uppercase underline hover:opacity-70 transition-opacity"
                  style={{ color: "#854d0e", fontFamily: "var(--font-brand), sans-serif" }}
                >
                  Pay Online (+3% card fee)
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center gap-3" style={{ backgroundColor: "#dcfce7", border: "1px solid #bbf7d0" }}>
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: "#166534", fontFamily: "var(--font-brand), sans-serif" }}>No outstanding balance</span>
            </div>
          )}

          {/* Orders */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>My Orders</h2>
              <div className="w-8 h-0.5 mt-2" style={{ backgroundColor: "#03033f" }} />
            </div>

            {myOrders.length === 0 ? (
              <div className="p-12 text-center bg-white" style={{ border: "1px solid #03033f0d" }}>
                <p className="text-xs tracking-widest uppercase" style={{ color: "#03033f55", fontFamily: "var(--font-brand), sans-serif" }}>No orders yet</p>
                <Link href="/products" className="inline-block mt-4 text-xs font-bold tracking-widest uppercase underline hover:opacity-60 transition-opacity" style={{ color: "#03033f88", fontFamily: "var(--font-brand), sans-serif" }}>
                  Browse Products
                </Link>
              </div>
            ) : (
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "2px solid #03033f14" }}>
                      {["Order", "Date", "Items", "Total", "Fulfillment", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myOrders.map((order) => {
                      const sc = STATUS_COLORS[order.status] ?? STATUS_COLORS.pending;
                      return (
                        <tr key={order.id} style={{ borderBottom: "1px solid #03033f08" }}>
                          <td className="px-4 py-3 font-bold text-xs" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>#{order.id.slice(-6)}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>{fmt(order.createdAt)}</td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>
                            {order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                          </td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: "#03033f" }}>
                            {order.invoiceTotal != null
                              ? fmtMoney(order.invoiceTotal)
                              : <span className="font-normal" style={{ color: "#03033f44" }}>Pending weight</span>}
                          </td>
                          <td className="px-4 py-3 text-xs capitalize" style={{ color: "#03033f88" }}>
                            {order.fulfillment ? (order.fulfillment === "delivery" && order.address ? `Delivery — ${order.address}` : "Pick-Up") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 text-xs font-bold tracking-widest uppercase" style={{ backgroundColor: sc.bg, color: sc.text, fontFamily: "var(--font-brand), sans-serif" }}>
                              {STATUS_LABELS[order.status] ?? order.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Payment History</h2>
                <div className="w-8 h-0.5 mt-2" style={{ backgroundColor: "#03033f" }} />
              </div>
              <div className="bg-white overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr style={{ borderBottom: "2px solid #03033f14" }}>
                      {["Date", "Amount Received", "Balance Before", "Balance After"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} style={{ borderBottom: "1px solid #03033f08" }}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#03033f88" }}>{fmt(p.receivedAt)}</td>
                        <td className="px-4 py-3 text-xs font-bold" style={{ color: "#166534" }}>{fmtMoney(p.amount)}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{p.balanceBefore != null ? fmtMoney(p.balanceBefore) : "—"}</td>
                        <td className="px-4 py-3 text-xs" style={{ color: "#03033f88" }}>{p.balanceAfter != null ? fmtMoney(p.balanceAfter) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Account info */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>Account Info</h2>
              <div className="w-8 h-0.5 mt-2" style={{ backgroundColor: "#03033f" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {[
                { label: "Name", value: pub.name },
                { label: "Email", value: pub.email },
                { label: "Phone", value: pub.phone ?? "—" },
                { label: "Company", value: pub.company ?? "—" },
                { label: "Member Since", value: fmt(pub.createdAt) },
              ].map(({ label, value }) => (
                <div key={label} className="p-4" style={{ backgroundColor: "#f8f8fb", border: "1px solid #03033f0d" }}>
                  <p className="font-bold tracking-widest uppercase text-xs mb-1" style={{ color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>{label}</p>
                  <p style={{ color: "#03033f" }}>{value}</p>
                </div>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#03033f55" }}>
              To update your account details or change your password, contact us at{" "}
              <a href="mailto:gfoods@telus.net" className="underline hover:opacity-60 transition-opacity" style={{ color: "#03033f88" }}>gfoods@telus.net</a>.
            </p>
            <DeleteAccountButton />
          </div>

        </div>
      </section>
    </>
  );
}
