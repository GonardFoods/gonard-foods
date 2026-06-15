"use client";

import { useState } from "react";

const TRANSFER_EMAIL = "gfoods@telus.net";

const BANKS = [
  { name: "RBC Royal Bank", domain: "rbc.com", url: "https://www.rbcroyalbank.com/" },
  { name: "TD Bank", domain: "td.com", url: "https://easyweb.td.com/" },
  { name: "CIBC", domain: "cibc.com", url: "https://www.cibc.com/en/personal-banking/ways-to-bank/online-banking.html" },
  { name: "BMO", domain: "bmo.com", url: "https://www.bmo.com/en-ca/main/personal/" },
  { name: "Scotiabank", domain: "scotiabank.com", url: "https://www.scotiabank.com/ca/en/personal.html" },
  { name: "National Bank", domain: "nbc.ca", url: "https://www.nbc.ca/en.html" },
  { name: "Tangerine", domain: "tangerine.ca", url: "https://www.tangerine.ca/en/" },
  { name: "Desjardins", domain: "desjardins.com", url: "https://www.desjardins.com/en/" },
  { name: "ATB Financial", domain: "atb.com", url: "https://www.atb.com/personal/" },
  { name: "Simplii Financial", domain: "simplii.com", url: "https://www.simplii.com/en/home.html" },
];

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PayModal({ amount, onClose }: { amount: number; onClose: () => void }) {
  const amountStr = fmtMoney(amount);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 50, backgroundColor: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "#fff", maxWidth: "560px", width: "100%", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* Header */}
        <div style={{ backgroundColor: "#03033f", padding: "24px 28px", display: "flex", justifyContent: "space-between", alignItems: "start" }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", fontWeight: "bold", letterSpacing: "0.25em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-brand), sans-serif" }}>
              Interac E-Transfer
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: "bold", color: "#fff", letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "var(--font-brand), sans-serif" }}>
              Pay {amountStr}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "2px 0 0 12px" }}
          >
            ✕
          </button>
        </div>

        {/* Instructions */}
        <div style={{ padding: "18px 28px", backgroundColor: "#fef9c3", borderBottom: "1px solid #fde68a" }}>
          <p style={{ margin: 0, fontSize: "13px", color: "#854d0e", lineHeight: 1.7 }}>
            Transfer exactly <strong>{amountStr}</strong> to <strong>{TRANSFER_EMAIL}</strong>
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#92400e", lineHeight: 1.6 }}>
            Include your name or order number in the message. Auto-deposit is enabled — no password required.
          </p>
        </div>

        {/* Bank grid */}
        <div style={{ padding: "22px 28px 10px" }}>
          <p style={{ margin: "0 0 14px", fontSize: "10px", fontWeight: "bold", letterSpacing: "0.2em", textTransform: "uppercase", color: "#03033f66", fontFamily: "var(--font-brand), sans-serif" }}>
            Select your bank to log in
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: "8px" }}>
            {BANKS.map((bank) => (
              <a
                key={bank.domain}
                href={bank.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "14px 8px 12px", border: "1px solid #03033f14", textDecoration: "none", gap: "9px", backgroundColor: "#fff", transition: "background 0.12s" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#f5f5fb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#fff"; }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://logo.clearbit.com/${bank.domain}?size=48`}
                  alt={bank.name + " logo"}
                  width={36}
                  height={36}
                  style={{ objectFit: "contain", display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <span style={{ fontSize: "10px", fontWeight: "bold", color: "#03033f", textAlign: "center", lineHeight: 1.3, fontFamily: "var(--font-brand), sans-serif", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  {bank.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        <div style={{ padding: "12px 28px 24px" }}>
          <button
            onClick={onClose}
            style={{ width: "100%", padding: "11px", backgroundColor: "transparent", border: "1px solid #03033f1a", color: "#03033f66", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.15em", textTransform: "uppercase", cursor: "pointer", fontFamily: "var(--font-brand), sans-serif" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function PayButton({ amount }: { amount: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: "10px 22px", backgroundColor: "#03033f", color: "#fff", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: "bold", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "var(--font-brand), sans-serif" }}
      >
        Pay Now
      </button>
      {open && <PayModal amount={amount} onClose={() => setOpen(false)} />}
    </>
  );
}
