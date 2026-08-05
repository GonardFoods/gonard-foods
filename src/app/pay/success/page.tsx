import Link from "next/link";

export default async function PaySuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; account?: string; already?: string }>;
}) {
  const { order, account, already } = await searchParams;

  return (
    <section
      className="py-24 px-6 text-center min-h-[60vh] flex items-center"
      style={{ backgroundColor: "#f8f8fb" }}
    >
      <div className="max-w-md mx-auto flex flex-col items-center gap-5">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ backgroundColor: "#dcfce7" }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-[0.08em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          {already ? "Already Paid" : "Payment Received"}
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#03033f88" }}>
          {already
            ? "This invoice has already been paid — no charge was made."
            : account
            ? "Thank you — your outstanding balance has been paid."
            : order
            ? `Thank you — your payment for order #${order.slice(-6).toUpperCase()} has been received.`
            : "Thank you — your payment has been received."}
        </p>
        <Link
          href={account ? "/account" : "/"}
          className="mt-2 px-8 py-3 font-bold text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {account ? "Back to Account" : "Return to Website"}
        </Link>
      </div>
    </section>
  );
}
