import Link from "next/link";

export default async function PayCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; reason?: string }>;
}) {
  const { order, reason } = await searchParams;

  const message =
    reason === "not-found"
      ? "We couldn't find that order."
      : reason === "no-total"
      ? "This order doesn't have an invoice total yet — it isn't ready to be paid online."
      : reason === "stripe-error"
      ? "Something went wrong starting the payment. Please try again or contact us."
      : "No charge was made — you can try again anytime, or pay by e-transfer instead.";

  const canRetry = order && reason !== "not-found" && reason !== "no-total";

  return (
    <section
      className="py-24 px-6 text-center min-h-[60vh] flex items-center"
      style={{ backgroundColor: "#f8f8fb" }}
    >
      <div className="max-w-md mx-auto flex flex-col items-center gap-5">
        <h1 className="text-2xl font-bold tracking-[0.08em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Payment Not Completed
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "#03033f88" }}>
          {message}
        </p>
        <Link
          href={canRetry ? `/api/orders/${order}/pay` : "/account"}
          className="mt-2 px-8 py-3 font-bold text-xs tracking-widest uppercase hover:opacity-90 transition-opacity"
          style={{ backgroundColor: "#03033f", color: "#fff", fontFamily: "var(--font-brand), sans-serif" }}
        >
          {canRetry ? "Try Again" : "Back to Account"}
        </Link>
      </div>
    </section>
  );
}
