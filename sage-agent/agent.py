"""
sage-agent/agent.py
===================
Runs on the sysadmin PC during office hours (8 AM – 4 PM).
Does two things on every poll cycle:

  1. EMAIL — Scans the inbox for Interac e-Transfer notifications, parses
     sender name + amount, fuzzy-matches the sender to a customer record,
     posts the payment to the web app (auto-applied or flagged as unmatched),
     and reduces the customer balance in the web app.

  2. SAGE — Queries the web app for invoiced orders not yet synced to Sage,
     creates a sales invoice in Sage 50 via the COM SDK, then marks the
     order as synced.

Requirements: pip install -r requirements.txt
              Sage 50 must be open and the company file must be loaded.

Setup:
  1. Copy config.py and fill in all REPLACE_WITH_* values.
  2. Install dependencies: pip install -r requirements.txt
  3. Run: python agent.py

The agent logs to agent.log in the same directory and prints to stdout.
"""

import imaplib
import email
import re
import time
import logging
import traceback
from datetime import datetime, timezone
from difflib import SequenceMatcher

import requests

# ── Sage COM import (Windows only) ─────────────────────────────────────────
try:
    import win32com.client as win32
    SAGE_AVAILABLE = True
except ImportError:
    SAGE_AVAILABLE = False
    logging.warning("pywin32 not installed — Sage integration disabled.")

import config

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    handlers=[
        logging.FileHandler("agent.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

# ── Web app helpers ──────────────────────────────────────────────────────────
HEADERS = {"x-agent-key": config.AGENT_KEY, "Content-Type": "application/json"}
BASE = config.WEB_APP_URL.rstrip("/")


def api(method: str, path: str, **kwargs):
    url = f"{BASE}{path}"
    resp = requests.request(method, url, headers=HEADERS, timeout=15, **kwargs)
    resp.raise_for_status()
    return resp.json()


# ── Fuzzy matching ────────────────────────────────────────────────────────────
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def best_customer_match(sender_name: str, customers: list[dict]):
    """
    Returns (customer, score) for the best match, or (None, 0) if no customers.
    Checks both full name and company name.
    """
    best, best_score = None, 0.0
    for c in customers:
        score = max(
            similarity(sender_name, c.get("name", "")),
            similarity(sender_name, c.get("company", "")),
        )
        if score > best_score:
            best, best_score = c, score
    return best, best_score


# ── IMAP / e-Transfer parsing ─────────────────────────────────────────────────
# Interac notification subject format (English):
#   "[Name] sent you an Interac e-Transfer for $[amount]"
# French variant:
#   "[Name] vous a envoyé un virement Interac de [amount] $"
SUBJECT_RE_EN = re.compile(
    r"^(.+?)\s+sent you an Interac e-Transfer for \$([0-9,]+(?:\.[0-9]{2})?)",
    re.IGNORECASE,
)
SUBJECT_RE_FR = re.compile(
    r"^(.+?)\s+vous a envoy[eé] un virement Interac de ([0-9,]+(?:[.,][0-9]{2})?)\s*\$",
    re.IGNORECASE,
)


def parse_etransfer_subject(subject: str):
    """Returns (sender_name, amount_float) or (None, None)."""
    for pattern in (SUBJECT_RE_EN, SUBJECT_RE_FR):
        m = pattern.match(subject)
        if m:
            name = m.group(1).strip()
            amount_str = m.group(2).replace(",", "")
            try:
                return name, float(amount_str)
            except ValueError:
                pass
    return None, None


def get_decoded_subject(msg) -> str:
    raw = msg.get("Subject", "")
    parts = email.header.decode_header(raw)
    decoded = ""
    for part, enc in parts:
        if isinstance(part, bytes):
            decoded += part.decode(enc or "utf-8", errors="replace")
        else:
            decoded += part
    return decoded


def check_email(processed_ids: set, customers: list[dict]) -> list[str]:
    """
    Connects to IMAP, finds unprocessed Interac e-Transfer emails,
    posts payments to the web app. Returns list of message IDs processed
    this cycle so the caller can add them to processed_ids.
    """
    newly_processed = []
    try:
        with imaplib.IMAP4_SSL(config.IMAP_HOST, config.IMAP_PORT) as imap:
            imap.login(config.IMAP_USER, config.IMAP_PASSWORD)
            imap.select(config.IMAP_FOLDER)

            # Search for Interac messages (unseen only to avoid re-processing old ones)
            _, data = imap.search(None, 'UNSEEN SUBJECT "Interac"')
            ids = data[0].split() if data[0] else []

            for msg_id in ids:
                str_id = msg_id.decode()
                if str_id in processed_ids:
                    continue

                _, raw = imap.fetch(msg_id, "(RFC822)")
                msg = email.message_from_bytes(raw[0][1])
                subject = get_decoded_subject(msg)
                received_at = datetime.now(timezone.utc).isoformat()

                sender_name, amount = parse_etransfer_subject(subject)
                if sender_name is None:
                    log.debug("Skipping non-e-transfer message: %s", subject)
                    newly_processed.append(str_id)
                    continue

                log.info("E-transfer detected: %s  $%.2f", sender_name, amount)

                customer, score = best_customer_match(sender_name, customers)
                if customer and score >= config.FUZZY_MATCH_THRESHOLD:
                    log.info(
                        "Matched to customer %s (score=%.2f) — auto-applying",
                        customer["name"], score,
                    )
                    source = "email_auto"
                    customer_id = customer["id"]
                    customer_name = customer["name"]
                else:
                    log.info(
                        "No confident match for '%s' (best score=%.2f) — flagging as unmatched",
                        sender_name, score,
                    )
                    source = "email_unmatched"
                    customer_id = None
                    customer_name = sender_name

                try:
                    api("POST", "/api/agent/payments", json={
                        "customerId": customer_id,
                        "customerName": customer_name,
                        "amount": amount,
                        "receivedAt": received_at,
                        "source": source,
                        "note": f"Interac e-Transfer — matched from: '{sender_name}'",
                    })
                    log.info("Payment saved (source=%s)", source)
                except Exception:
                    log.error("Failed to save payment:\n%s", traceback.format_exc())

                newly_processed.append(str_id)

    except Exception:
        log.error("IMAP error:\n%s", traceback.format_exc())

    return newly_processed


# ── Sage 50 COM integration ───────────────────────────────────────────────────
#
# IMPORTANT — SDK method names must be verified against your installed Sage 50
# SDK documentation. The SDK ships with a help file and/or a sample project.
#
# Typical path: C:\Program Files (x86)\Sage\Sage 50 Accounting\SDK\
#
# The stubs below use the most common method signatures observed in the
# Sage 50 Canadian SDK. If a call fails with an AttributeError or COM error,
# check the SDK docs for the correct property/method name and update here.


def get_sage_app():
    """
    Returns a connected Sage 50 COM application object, or None if unavailable.
    Sage must already be open with the company file loaded.
    """
    if not SAGE_AVAILABLE:
        return None
    try:
        app = win32.GetActiveObject(config.SAGE_PROG_ID)
        return app
    except Exception:
        try:
            # Fall back to CreateObject if GetActiveObject fails (Sage not running)
            app = win32.CreateObject(config.SAGE_PROG_ID)
            app.OpenCompany(config.SAGE_COMPANY_FILE)
            return app
        except Exception:
            log.warning("Could not connect to Sage 50 — skipping Sage sync this cycle.")
            return None


def create_sage_invoice(app, order: dict) -> bool:
    """
    Creates a sales invoice in Sage 50 for the given order dict.
    Returns True on success.

    ORDER FIELDS USED:
      order["id"]                 — used as the invoice reference/PO number
      order["customer"]["name"]   — looked up in Sage customer list
      order["customer"]["email"]
      order["invoiceTotal"]       — total in CAD
      order["invoicedAt"]         — invoice date
      order["items"]              — line items

    SAGE SDK NOTES (verify method names in your SDK help file):
      app.Company           — the open company object
      company.SalesInvoices — collection of sales invoices
      invoice.CustomerID    — Sage customer code; must match exactly
      invoice.Add()         — creates the invoice
      invoice.Post()        — posts (commits) it
    """
    try:
        company = app.Company
        customer_name = order["customer"]["name"]

        # ── Find or create the Sage customer ─────────────────────────────────
        # SDK docs: company.Customers is the customer collection.
        # Each customer has .Name and .ID properties.
        # TODO: verify exact property names in your SDK docs.
        sage_customer_id = None
        try:
            customers = company.Customers
            for i in range(customers.Count):
                c = customers.Item(i + 1)          # 1-indexed in COM
                if c.Name.strip().lower() == customer_name.lower():
                    sage_customer_id = c.ID
                    break
        except Exception:
            log.warning("Could not enumerate Sage customers — invoice will use name directly.")

        # ── Build invoice ─────────────────────────────────────────────────────
        invoices = company.SalesInvoices
        invoice = invoices.Add()

        # Header fields — verify against SDK docs
        invoice.Date = order.get("invoicedAt", datetime.utcnow().isoformat())[:10]
        if sage_customer_id:
            invoice.CustomerID = sage_customer_id
        else:
            invoice.CustomerName = customer_name   # fallback if not found in Sage

        invoice.CustomerPONumber = order["id"][:20]   # web app order ID as reference
        invoice.Comment = f"Web order {order['id']}"

        # ── Line items ────────────────────────────────────────────────────────
        lines = invoice.Lines
        for item in order.get("items", []):
            line = lines.Add()
            # SDK: line.ItemID matches a Sage inventory item code (item number)
            # TODO: map order item.itemNo to Sage inventory item ID
            line.ItemID = item.get("itemNo", "")
            line.Description = item.get("name", "")
            line.Quantity = item.get("qty", 1)

            pricing_type = item.get("pricingType", "per_weight")
            if pricing_type == "per_weight":
                # For per-weight items, lineTotal is pre-computed at finalization
                line_total = item.get("lineTotal", 0)
                line.UnitPrice = line_total / max(item.get("qty", 1), 1)
            else:
                line.UnitPrice = item.get("pricePerUnit", 0)

        # ── Post invoice ──────────────────────────────────────────────────────
        invoice.Post()
        log.info("Sage invoice created for order %s (customer: %s)", order["id"], customer_name)
        return True

    except Exception:
        log.error("Failed to create Sage invoice for order %s:\n%s", order.get("id"), traceback.format_exc())
        return False


def sync_invoiced_orders(app):
    """Fetch unsynced invoiced orders and create Sage invoices for each."""
    if app is None:
        return
    try:
        orders = api("GET", "/api/agent/orders?unsynced=true")
    except Exception:
        log.error("Could not fetch orders:\n%s", traceback.format_exc())
        return

    for order in orders:
        success = create_sage_invoice(app, order)
        if success:
            try:
                api("PATCH", f"/api/agent/orders/{order['id']}", json={"sageSynced": True})
                log.info("Order %s marked sageSynced", order["id"])
            except Exception:
                log.error("Could not mark order %s as synced:\n%s", order["id"], traceback.format_exc())


def sync_payments(app):
    """Fetch unsynced payments and record receipts in Sage."""
    if app is None:
        return
    try:
        payments = api("GET", "/api/agent/payments?unsynced=true")
    except Exception:
        log.error("Could not fetch payments:\n%s", traceback.format_exc())
        return

    for payment in payments:
        if not payment.get("customerId"):
            # Unmatched — skip until manually assigned
            continue
        success = record_sage_receipt(app, payment)
        if success:
            try:
                api("PATCH", f"/api/agent/payments/{payment['id']}", json={"sageSynced": True})
            except Exception:
                log.error("Could not mark payment %s as synced:\n%s", payment["id"], traceback.format_exc())


def record_sage_receipt(app, payment: dict) -> bool:
    """
    Records a customer receipt (payment received) in Sage 50.

    SDK NOTES:
      company.CustomerReceipts — collection of customer receipts
      receipt.CustomerID       — Sage customer ID
      receipt.Amount           — payment amount
      receipt.Date             — ISO date string
      receipt.Post()           — commits it

    TODO: verify exact property names in your SDK docs.
    """
    try:
        company = app.Company
        customer_name = payment.get("customerName", "")

        # Find Sage customer ID by name
        sage_customer_id = None
        try:
            customers = company.Customers
            for i in range(customers.Count):
                c = customers.Item(i + 1)
                if c.Name.strip().lower() == customer_name.lower():
                    sage_customer_id = c.ID
                    break
        except Exception:
            pass

        if not sage_customer_id:
            log.warning("Customer '%s' not found in Sage — skipping receipt", customer_name)
            return False

        receipts = company.CustomerReceipts
        receipt = receipts.Add()
        receipt.CustomerID = sage_customer_id
        receipt.Amount = payment["amount"]
        receipt.Date = payment.get("receivedAt", "")[:10]
        receipt.Comment = payment.get("note", "Interac e-Transfer")
        receipt.Post()

        log.info("Sage receipt recorded: $%.2f for %s", payment["amount"], customer_name)
        return True

    except Exception:
        log.error("Failed to record Sage receipt for payment %s:\n%s", payment.get("id"), traceback.format_exc())
        return False


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    log.info("Sage agent starting. Poll interval: %ds", config.POLL_INTERVAL_SECONDS)
    processed_email_ids: set[str] = set()

    while True:
        try:
            # Refresh customer list every cycle for up-to-date fuzzy matching
            customers = api("GET", "/api/agent/customers")
        except Exception:
            log.error("Could not fetch customers — skipping cycle:\n%s", traceback.format_exc())
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        # 1. Email / e-transfer detection
        new_ids = check_email(processed_email_ids, customers)
        processed_email_ids.update(new_ids)

        # 2. Sage sync (only if Sage is reachable)
        sage_app = get_sage_app()
        sync_invoiced_orders(sage_app)
        sync_payments(sage_app)

        log.info("Cycle complete. Sleeping %ds.", config.POLL_INTERVAL_SECONDS)
        time.sleep(config.POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
