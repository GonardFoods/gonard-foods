"""
sage-agent/agent.py
===================
Runs on the company PC. Does two things every poll cycle:

  1. EMAIL — Scans the inbox for Interac e-Transfer notifications, parses the
     sender name and amount, fuzzy-matches the sender to a customer, posts the
     payment to the web app (auto-applied or flagged as unmatched), and reduces
     the customer's outstanding balance.

  2. SAGE  — Fetches invoiced orders not yet synced to Sage 50, creates a sales
     invoice in Sage for each one, then marks the order as synced. Also records
     matched e-transfer payments as customer receipts in Sage.

NOTE: Sage 50 does NOT need to be open. The SDK connects to the database file
      directly. However, no other user should be editing the same company file
      at the exact same time the agent is writing (a few seconds per cycle).

Setup:
  1. Edit config.py — fill in all REPLACE_WITH_* values.
  2. pip install -r requirements.txt
  3. python agent.py

Logs go to agent.log in this folder and to the terminal.
"""

import imaplib
import email
import email.header
import json
import os
import re
import sys
import time
import logging
import traceback
from datetime import datetime, timezone, timedelta
from difflib import SequenceMatcher

import requests

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

# ── Sage SDK setup (pythonnet / .NET Framework 4.8) ──────────────────────────
SAGE_AVAILABLE = False
SDKInstanceManager = None

def load_sage_sdk():
    global SAGE_AVAILABLE, SDKInstanceManager
    try:
        import pythonnet
        pythonnet.load("netfx")          # target .NET Framework, not .NET Core
        import clr

        # Add SDK folder so the runtime can find all dependent DLLs
        sys.path.insert(0, config.SAGE_SDK_PATH)
        clr.AddReference("Sage_SA.SDK")

        from SimplySDK import SDKInstanceManager as _mgr

        # Try to set up a silent alert handler; skip if the alert API differs in this SDK version
        try:
            from SimplySDK.Support import SDKAlert, AlertResult

            class SilentAlert(SDKAlert):
                def AskAlert(self, message):
                    log.info("Sage alert: %s", message.Message)
                    return AlertResult.YES
                def AskSaveAlert(self):
                    return AlertResult.YES
                def YNCAlert(self, message):
                    log.info("Sage YNC alert: %s", message.Message)
                    return AlertResult.YES
                def StopAlert(self, message):
                    log.warning("Sage stop: %s", message.Message)
                def StopAlertNotShow(self, message):
                    return False

            _mgr.Instance.SetAlertImplementation(SilentAlert())
            log.info("Sage alert handler installed")
        except Exception:
            log.info("Sage alert handler skipped (SDK version difference) — exceptions will be raised on alerts")

        SDKInstanceManager = _mgr
        SAGE_AVAILABLE = True
        log.info("Sage 50 SDK loaded from %s", config.SAGE_SDK_PATH)
    except Exception:
        log.warning("Could not load Sage 50 SDK — Sage sync disabled.\n%s", traceback.format_exc())


def open_sage_db():
    """Open the Sage database. Returns True on success."""
    if not SAGE_AVAILABLE:
        return False
    try:
        ok = SDKInstanceManager.Instance.OpenDatabase(
            config.SAGE_COMPANY_FILE,
            config.SAGE_USERNAME,
            config.SAGE_PASSWORD,
            True,                   # openMultiUserMode = True (shared access alongside Sage UI)
            "Gonard Foods Agent",   # application name shown in Sage logs
            "GFAGENT",              # short app code
            1,                      # number of users
        )
        if not ok:
            log.warning("Sage OpenDatabase returned False — check credentials and file path.")
        return ok
    except Exception:
        log.error("Sage OpenDatabase failed:\n%s", traceback.format_exc())
        return False


def close_sage_db():
    if SAGE_AVAILABLE:
        try:
            SDKInstanceManager.Instance.CloseDatabase()
        except Exception:
            pass


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


def best_customer_match(sender_name: str, customers: list):
    best, best_score = None, 0.0
    for c in customers:
        score = max(
            similarity(sender_name, c.get("name", "")),
            similarity(sender_name, c.get("company", "")),
        )
        if score > best_score:
            best, best_score = c, score
    return best, best_score


# ── IMAP / Interac e-transfer parsing ────────────────────────────────────────
# Each entry: (compiled_regex, role_of_group1, role_of_group2)
# role is "name" or "amount" — tells _apply_patterns which group is which.
# Uses search() not match() so prefixes like "Interac e-Transfer: " don't block matching.
_SUBJECT_PATTERNS = [
    # "{Name} sent you an Interac e-Transfer® for $100.00"
    (re.compile(
        r"(.+?)\s+sent you an?\s+Interac\S*\s*e-Transfer\S*\s+for\s+\$([0-9,]+(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    ), "name", "amount"),

    # "You've received $100.00 from {Name}" — auto-deposit notification
    (re.compile(
        r"you(?:'ve| have)?\s+received\s+\$([0-9,]+(?:\.[0-9]{1,2})?)\s+from\s+(.+?)(?:\s*[\(\.\n,]|$)",
        re.IGNORECASE,
    ), "amount", "name"),

    # "$100.00 deposited from {Name}"
    (re.compile(
        r"\$([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:deposited\s+)?from\s+(.+?)(?:\s*[\(\.\n,]|$)",
        re.IGNORECASE,
    ), "amount", "name"),

    # French: "{Name} vous a envoyé un virement Interac de 100,00 $"
    (re.compile(
        r"(.+?)\s+vous a envoy[eé] un virement Interac.*?de ([0-9\s,]+(?:[.,][0-9]{1,2})?)\s*\$",
        re.IGNORECASE,
    ), "name", "amount"),
]

# Same idea but applied to plain-text email body as a fallback.
_BODY_PATTERNS = [
    (re.compile(
        r"(.+?)\s+sent you an?\s+(?:Interac\S*\s*)?e-Transfer\S*\s+(?:of\s+)?\$([0-9,]+(?:\.[0-9]{1,2})?)",
        re.IGNORECASE,
    ), "name", "amount"),
    (re.compile(
        r"you(?:'ve| have)?\s+received\s+\$([0-9,]+(?:\.[0-9]{1,2})?)\s+from\s+(.+?)[\.\n]",
        re.IGNORECASE,
    ), "amount", "name"),
    (re.compile(
        r"\$([0-9,]+(?:\.[0-9]{1,2})?)\s+(?:has been )?(?:deposited|sent)\b.*?(?:by|from)\s+(.+?)[\.\n]",
        re.IGNORECASE,
    ), "amount", "name"),
]

# File that persists processed IMAP UIDs across agent restarts.
# UIDs are stable identifiers assigned by the mail server (unlike sequence numbers).
PROCESSED_UIDS_FILE = "processed_uids.json"


def load_processed_uids() -> set:
    if os.path.exists(PROCESSED_UIDS_FILE):
        try:
            with open(PROCESSED_UIDS_FILE, "r", encoding="utf-8") as f:
                return set(json.load(f))
        except Exception:
            log.warning("Could not load %s — starting fresh", PROCESSED_UIDS_FILE)
    return set()


def save_processed_uids(uids: set):
    try:
        with open(PROCESSED_UIDS_FILE, "w", encoding="utf-8") as f:
            json.dump(list(uids), f)
    except Exception:
        log.warning("Could not save %s:\n%s", PROCESSED_UIDS_FILE, traceback.format_exc())


def _apply_patterns(text: str, patterns: list):
    """Try each (regex, g1_role, g2_role) pattern against text; return (name, amount) or (None, None)."""
    for pattern, g1_role, g2_role in patterns:
        m = pattern.search(text)
        if m:
            try:
                g1, g2 = m.group(1).strip(), m.group(2).strip()
                name, amt_str = (g1, g2) if g1_role == "name" else (g2, g1)
                return name, float(amt_str.replace(",", "").replace(" ", ""))
            except (ValueError, IndexError, AttributeError):
                pass
    return None, None


def parse_etransfer_subject(subject: str):
    return _apply_patterns(subject, _SUBJECT_PATTERNS)


def get_email_text(msg) -> str:
    """Extract usable plain text from an email (plain-text part, then HTML with tags stripped)."""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                try:
                    return part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="replace"
                    )
                except Exception:
                    pass
        for part in msg.walk():
            if part.get_content_type() == "text/html":
                try:
                    html = part.get_payload(decode=True).decode(
                        part.get_content_charset() or "utf-8", errors="replace"
                    )
                    return re.sub(r"<[^>]+>", " ", html)
                except Exception:
                    pass
    else:
        try:
            return msg.get_payload(decode=True).decode(
                msg.get_content_charset() or "utf-8", errors="replace"
            )
        except Exception:
            pass
    return ""


def decode_subject(msg) -> str:
    raw = msg.get("Subject", "")
    parts = email.header.decode_header(raw)
    decoded = ""
    for part, enc in parts:
        if isinstance(part, bytes):
            decoded += part.decode(enc or "utf-8", errors="replace")
        else:
            decoded += part
    return decoded


def check_email(processed_uids: set, customers: list) -> set:
    """
    Scans the inbox for Interac e-Transfer notifications using IMAP UIDs.

    Uses UIDs (not sequence numbers) so deduplication survives restarts.
    Searches ALL emails from the past 90 days — not just UNSEEN — so already-read
    notifications are still processed.
    """
    newly_processed = set()
    try:
        with imaplib.IMAP4_SSL(config.IMAP_HOST, config.IMAP_PORT) as imap:
            imap.login(config.IMAP_USER, config.IMAP_PASSWORD)
            imap.select("INBOX")

            # UID SEARCH returns stable IDs that don't change when other messages are deleted.
            cutoff_dt = datetime.strptime(config.EMAIL_CUTOFF_DATE, "%d-%b-%Y").replace(tzinfo=timezone.utc)
            rolling_dt = datetime.now(timezone.utc) - timedelta(days=45)
            since_dt = max(cutoff_dt, rolling_dt)
            since_date = since_dt.strftime("%d-%b-%Y")

            _, data = imap.uid("SEARCH", None, f'SINCE {since_date} SUBJECT "Interac"')
            uids = data[0].split() if data[0] else []
            log.info("Inbox scan: %d Interac email(s) found since %s", len(uids), since_date)

            for uid_bytes in uids:
                uid = uid_bytes.decode()
                if uid in processed_uids:
                    continue

                _, raw = imap.uid("FETCH", uid_bytes, "(RFC822)")
                if not raw or raw[0] is None:
                    newly_processed.add(uid)
                    continue

                msg = email.message_from_bytes(raw[0][1])
                subject = decode_subject(msg)
                received_at = datetime.now(timezone.utc).isoformat()

                sender_name, amount = parse_etransfer_subject(subject)
                if sender_name is None:
                    # Subject didn't match — try the email body as a fallback
                    body_text = get_email_text(msg)
                    sender_name, amount = _apply_patterns(body_text, _BODY_PATTERNS)

                if sender_name is None:
                    log.warning(
                        "UID %s: could not parse e-transfer — subject was: %r",
                        uid, subject[:200],
                    )
                    newly_processed.add(uid)
                    continue

                log.info("E-transfer: '%s'  $%.2f  (UID %s)", sender_name, amount, uid)
                customer, score = best_customer_match(sender_name, customers)

                if customer and score >= config.FUZZY_MATCH_THRESHOLD:
                    log.info("Matched → %s (score=%.2f)", customer["name"], score)
                    source       = "email_auto"
                    customer_id  = customer["id"]
                    customer_name_val = customer["name"]
                else:
                    log.info("No match for '%s' (best score=%.2f) — flagging as unmatched", sender_name, score)
                    source       = "email_unmatched"
                    customer_id  = None
                    customer_name_val = sender_name

                try:
                    resp = api("POST", "/api/agent/payments", json={
                        "customerId":   customer_id,
                        "customerName": customer_name_val,
                        "amount":       amount,
                        "receivedAt":   received_at,
                        "source":       source,
                        "note":         f"Interac e-Transfer — sender: '{sender_name}'",
                        "emailUid":     uid,
                    })
                    if resp.get("duplicate"):
                        log.info("UID %s already recorded server-side — skipping", uid)
                    else:
                        log.info("Payment posted to web app (%s)", source)
                except Exception:
                    log.error("Failed to post payment to web app:\n%s", traceback.format_exc())
                    # Don't add to processed_uids — retry next cycle
                    continue

                newly_processed.add(uid)

    except Exception:
        log.error("IMAP error:\n%s", traceback.format_exc())

    return newly_processed


# ── Sage: ensure customer exists ─────────────────────────────────────────────
def ensure_sage_customer(cust: dict) -> bool:
    """
    Checks whether a customer exists in Sage by business name. Creates them if not.
    The Sage 'Customer' (Name) field is the business name; 'Contact' is the person's name.
    `cust` is any dict with name, company, email, phone, and address fields
    (works for both web Customer records and order CustomerInfo records).
    Returns True if the customer is ready to be invoiced.
    """
    try:
        sage_name = (cust.get("company") or cust.get("name", "")).strip()
        if not sage_name:
            log.warning("Customer has no name — cannot ensure Sage customer")
            return False

        custled = SDKInstanceManager.Instance.OpenCustomerLedger()
        try:
            if custled.LoadByName(sage_name):
                return True  # already exists

            # Create new customer
            custled.InitializeNew()
            custled.Name    = sage_name
            custled.Contact = cust.get("name", "")
            if cust.get("street1"):    custled.Street1    = cust["street1"]
            if cust.get("street2"):    custled.Street2    = cust["street2"]
            if cust.get("city"):       custled.City       = cust["city"]
            if cust.get("province"):   custled.Province   = cust["province"]
            if cust.get("postalCode"): custled.PostalCode = cust["postalCode"]
            if cust.get("country"):    custled.Country    = cust["country"]
            if cust.get("email"):      custled.Email      = cust["email"]
            if cust.get("phone"):      custled.Phone1     = cust["phone"]

            saved = custled.Save()
            if saved:
                log.info("Created Sage customer: %s", sage_name)
            else:
                log.warning("Sage customer Save() returned False for '%s'", sage_name)
            return saved
        finally:
            SDKInstanceManager.Instance.CloseCustomerLedger()

    except Exception:
        log.error("Failed to ensure Sage customer '%s':\n%s",
                  (cust.get("company") or cust.get("name", "?")), traceback.format_exc())
        return False


# ── Sage: create sales invoice ────────────────────────────────────────────────
def create_sage_invoice(order: dict) -> bool:
    """
    Creates a sales invoice in Sage 50 using the SimplySDK SalesJournal.
    Automatically creates the customer in Sage first if they don't exist.
    Items are matched by itemNo (must match Sage inventory part codes).
    """
    try:
        cust = order["customer"]
        # Ensure customer exists in Sage before opening the journal
        if not ensure_sage_customer(cust):
            log.error("Aborting invoice for order %s — could not ensure Sage customer", order.get("id"))
            return False

        sage_customer_name = (cust.get("company") or cust.get("name", "")).strip()

        sal = SDKInstanceManager.Instance.OpenSalesJournal()
        try:
            sal.SelectTransType(0)                    # 0 = invoice (not order/quote)
            sal.InvoiceNumber = order["id"][:20]      # web order ID as invoice number
            sal.SelectAPARLedger(sage_customer_name)  # business name, now guaranteed to exist
            sal.SelectPaidByType("Pay Later")         # outstanding balance
            sal.SelectPaidByType("Pay Later")               # outstanding balance

            date_str = (order.get("invoicedAt") or datetime.utcnow().isoformat())[:10]
            sal.SetShipDate(date_str)

            for i, item in enumerate(order.get("items", []), start=1):
                sal.SetItemNumber(item.get("itemNo", ""), i)
                sal.SetQuantity(item.get("qty", 1), i)
                sal.SetUnit("Case", i)
                sal.SetDescription(item.get("name", ""), i)

                pricing = item.get("pricingType", "per_weight")
                if pricing == "per_weight":
                    # lineTotal was computed at finalization (weight × price/unit)
                    line_total = item.get("lineTotal") or 0
                    qty = max(item.get("qty", 1), 1)
                    sal.SetPrice(round(line_total / qty, 4), i)
                    sal.SetLineAmount(line_total, i)
                else:
                    price = item.get("pricePerUnit") or 0
                    sal.SetPrice(price, i)
                    sal.SetLineAmount(price * item.get("qty", 1), i)

            sal.SetComment(f"Web order {order['id']}")

            ok = sal.Post()
            if ok:
                log.info("Sage invoice posted for order %s", order["id"])
            else:
                log.warning("Sage invoice Post() returned False for order %s", order["id"])
            return ok
        finally:
            SDKInstanceManager.Instance.CloseSalesJournal()

    except Exception:
        log.error("Failed to create Sage invoice for order %s:\n%s", order.get("id"), traceback.format_exc())
        return False


# ── Sage: record customer receipt ─────────────────────────────────────────────
def record_sage_receipt(payment: dict) -> bool:
    """
    Records a customer receipt (e-transfer payment) in Sage 50.
    The customer must already exist in Sage.
    """
    try:
        rec = SDKInstanceManager.Instance.OpenReceiptsJournal()
        try:
            rec.SelectAPARLedger(payment["customerName"])
            rec.SelectPaidByType("Cheque")
            rec.SetDepositAmount(payment["amount"])
            date_str = (payment.get("receivedAt") or datetime.utcnow().isoformat())[:10]
            rec.SetJournalDate(date_str)
            rec.SetComment(payment.get("note") or "Interac e-Transfer")
            ok = rec.Post()
            if ok:
                log.info("Sage receipt posted: $%.2f for %s", payment["amount"], payment["customerName"])
            else:
                log.warning("Sage receipt Post() returned False for payment %s", payment.get("id"))
            return ok
        finally:
            SDKInstanceManager.Instance.CloseReceiptsJournal()

    except Exception:
        log.error("Failed to record Sage receipt for payment %s:\n%s", payment.get("id"), traceback.format_exc())
        return False




# ── Sync loops ────────────────────────────────────────────────────────────────
def sync_customers(customers: list):
    """
    Ensures every web-app customer account exists as a customer in Sage.
    Called every cycle so new sign-ups are added automatically.
    `customers` is the list already fetched at the top of the cycle (reused, no extra API call).
    """
    for customer in customers:
        ensure_sage_customer(customer)


def sync_invoiced_orders():
    try:
        orders = api("GET", "/api/agent/orders?unsynced=true")
    except Exception:
        log.error("Could not fetch orders:\n%s", traceback.format_exc())
        return

    for order in orders:
        ok = create_sage_invoice(order)
        if ok:
            try:
                api("PATCH", f"/api/agent/orders/{order['id']}", json={"sageSynced": True})
                log.info("Order %s marked sageSynced", order["id"])
            except Exception:
                log.error("Could not mark order %s synced:\n%s", order["id"], traceback.format_exc())


def send_invoice_emails():
    """
    Finds fulfilled orders whose Sage invoice exists (sageSynced=True) but whose
    invoice email has not yet been sent, then triggers the web app to send it via
    Resend and mark invoiceEmailSent in one step.
    """
    try:
        orders = api("GET", "/api/agent/orders?needsInvoiceEmail=true")
    except Exception:
        log.error("Could not fetch orders needing invoice email:\n%s", traceback.format_exc())
        return

    for order in orders:
        try:
            api("POST", f"/api/agent/orders/{order['id']}/invoice-email", json={})
            log.info("Invoice email sent for order %s", order["id"])
        except Exception:
            log.error("Could not send invoice email for order %s:\n%s", order["id"], traceback.format_exc())


def sync_payments(customers: list):
    try:
        payments = api("GET", "/api/agent/payments?unsynced=true")
    except Exception:
        log.error("Could not fetch payments:\n%s", traceback.format_exc())
        return

    # Sage customer ledger entries use company name (same logic as ensure_sage_customer).
    # The payment record only stores the personal name, so look up the full record here.
    customer_by_id = {c["id"]: c for c in customers}

    for payment in payments:
        if not payment.get("customerId"):
            continue  # unmatched — skip until manually assigned in admin dashboard

        customer = customer_by_id.get(payment["customerId"])
        if customer:
            sage_name = (customer.get("company") or customer.get("name", "")).strip()
        else:
            # Customer no longer in web app — fall back to stored name and log it
            sage_name = payment.get("customerName", "")
            log.warning("Payment %s: customer %s not found in current list — using stored name '%s'",
                        payment["id"], payment["customerId"], sage_name)

        ok = record_sage_receipt({**payment, "customerName": sage_name})
        if ok:
            try:
                api("PATCH", f"/api/agent/payments/{payment['id']}", json={"sageSynced": True})
            except Exception:
                log.error("Could not mark payment %s synced:\n%s", payment["id"], traceback.format_exc())


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    log.info("Gonard Foods Sage agent starting. Poll interval: %ds", config.POLL_INTERVAL_SECONDS)
    load_sage_sdk()
    processed_uids = load_processed_uids()
    log.info("Loaded %d previously processed email UIDs from disk", len(processed_uids))

    while True:
        # Fetch current customer list for fuzzy name matching
        try:
            customers = api("GET", "/api/agent/customers")
        except Exception:
            log.error("Could not fetch customers — skipping cycle:\n%s", traceback.format_exc())
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        # 1. Email scan
        new_uids = check_email(processed_uids, customers)
        if new_uids:
            processed_uids.update(new_uids)
            save_processed_uids(processed_uids)

        # 2. Sage sync
        if SAGE_AVAILABLE:
            if open_sage_db():
                try:
                    sync_customers(customers)
                    sync_invoiced_orders()
                    sync_payments(customers)
                    send_invoice_emails()
                finally:
                    close_sage_db()

        log.info("Cycle complete. Sleeping %ds.", config.POLL_INTERVAL_SECONDS)
        time.sleep(config.POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
