"use client";

import { useEffect, useState } from "react";

interface BankAccountInfo {
  bankName: string | null;
  last4: string;
  currency: string;
  status: string;
  default: boolean;
}

interface StripeStatus {
  configured: boolean;
  livemode?: boolean;
  accountId?: string;
  country?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
  payoutSchedule?: { interval: string; delayDays: number } | null;
  bankAccounts?: BankAccountInfo[];
  error?: string;
}

function StatusRow({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid #03033f0d" }}>
      <span className="text-sm" style={{ color: "#03033f" }}>{label}</span>
      <span
        className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase"
        style={{
          backgroundColor: ok ? "#dcfce7" : "#fef2f2",
          color: ok ? "#166534" : "#dc2626",
          fontFamily: "var(--font-brand), sans-serif",
        }}
      >
        {ok ? okText : badText}
      </span>
    </div>
  );
}

export default function StripeStatusPage() {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stripe-status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-[0.1em] uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
          Stripe
        </h1>
        <div className="w-10 h-0.5 mt-3" style={{ backgroundColor: "#03033f" }} />
        <p className="text-sm mt-4" style={{ color: "#03033f88" }}>
          Live status of the Stripe account online card payments connect to — whether it can charge cards, and where payouts go.
        </p>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: "#03033f66" }}>Checking…</p>
      ) : !status?.configured ? (
        <div className="p-6" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-sm font-bold" style={{ color: "#dc2626" }}>Stripe is not configured</p>
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{status?.error}</p>
        </div>
      ) : status.error ? (
        <div className="p-6" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
          <p className="text-sm font-bold" style={{ color: "#dc2626" }}>Couldn&apos;t reach Stripe</p>
          <p className="text-xs mt-1" style={{ color: "#dc2626" }}>{status.error}</p>
          <p className="text-xs mt-3" style={{ color: "#dc2626" }}>
            {status.livemode
              ? "The configured key is a LIVE key, so this is likely a real account/API issue — check the Stripe Dashboard."
              : "The configured key is a TEST key — no real money moves through this, and it won't have real payout/bank details either way."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white p-6" style={{ border: "1px solid #03033f14" }}>
            <StatusRow
              label="Mode"
              ok={!!status.livemode}
              okText="Live — real money"
              badText="Test — no real money moves"
            />
            <StatusRow
              label="Can accept card payments"
              ok={!!status.chargesEnabled}
              okText="Enabled"
              badText="Disabled"
            />
            <StatusRow
              label="Can pay out to bank"
              ok={!!status.payoutsEnabled}
              okText="Enabled"
              badText="Disabled"
            />
            <StatusRow
              label="Onboarding complete"
              ok={!!status.detailsSubmitted}
              okText="Complete"
              badText="Incomplete"
            />
          </div>

          <div className="bg-white p-6 flex flex-col gap-4" style={{ border: "1px solid #03033f14" }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Bank Account
            </p>
            {!status.bankAccounts || status.bankAccounts.length === 0 ? (
              <p className="text-sm" style={{ color: "#dc2626" }}>
                No bank account is attached to this Stripe account — payouts can&apos;t happen until one is added in the Stripe Dashboard (Settings → Bank accounts and scheduling).
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {status.bankAccounts.map((ba, i) => (
                  <div key={i} className="flex items-center justify-between p-4" style={{ backgroundColor: "#f8f8fb" }}>
                    <div>
                      <p className="text-sm font-bold" style={{ color: "#03033f" }}>
                        {ba.bankName ?? "Unknown Bank"} ····{ba.last4}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#03033f88" }}>
                        {ba.currency}{ba.default ? " · Default for payouts" : ""}
                      </p>
                    </div>
                    <span
                      className="px-2.5 py-1 text-xs font-bold tracking-widest uppercase"
                      style={{
                        backgroundColor: ba.status === "verified" || ba.status === "new" || ba.status === "validated" ? "#dcfce7" : "#fef2f2",
                        color: ba.status === "verified" || ba.status === "new" || ba.status === "validated" ? "#166534" : "#dc2626",
                        fontFamily: "var(--font-brand), sans-serif",
                      }}
                    >
                      {ba.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-6 flex flex-col gap-2" style={{ border: "1px solid #03033f14" }}>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#03033f", fontFamily: "var(--font-brand), sans-serif" }}>
              Payout Schedule
            </p>
            {status.payoutSchedule ? (
              <p className="text-sm" style={{ color: "#03033f" }}>
                {status.payoutSchedule.interval === "manual"
                  ? "Manual — you have to trigger each payout yourself in the Stripe Dashboard."
                  : `Automatic, ${status.payoutSchedule.interval}`}
                {status.payoutSchedule.interval !== "manual" && status.payoutSchedule.delayDays > 0 && (
                  <> — funds held {status.payoutSchedule.delayDays} day{status.payoutSchedule.delayDays === 1 ? "" : "s"} before payout</>
                )}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "#03033f66" }}>Unknown</p>
            )}
          </div>

          <p className="text-xs" style={{ color: "#03033f55" }}>
            Account {status.accountId} · {status.country}
          </p>
        </>
      )}
    </div>
  );
}
