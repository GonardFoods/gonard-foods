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
import re
import sys
import time
import logging
import traceback
from datetime import datetime, timezone
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
            False,                  # read-only = False
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
SUBJECT_RE_EN = re.compile(
    r"^(.+?)\s+sent you an Interac e-Transfer for \$([0-9,]+(?:\.[0-9]{2})?)",
    re.IGNORECASE,
)
SUBJECT_RE_FR = re.compile(
    r"^(.+?)\s+vous a envoy[eé] un virement Interac de ([0-9,]+(?:[.,][0-9]{2})?)\s*\$",
    re.IGNORECASE,
)


def parse_etransfer_subject(subject: str):
    for pattern in (SUBJECT_RE_EN, SUBJECT_RE_FR):
        m = pattern.match(subject)
        if m:
            try:
                return m.group(1).strip(), float(m.group(2).replace(",", ""))
            except ValueError:
                pass
    return None, None


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


def check_email(processed_ids: set, customers: list) -> list:
    newly_processed = []
    try:
        with imaplib.IMAP4_SSL(config.IMAP_HOST, config.IMAP_PORT) as imap:
            imap.login(config.IMAP_USER, config.IMAP_PASSWORD)
            imap.select("INBOX")
            _, data = imap.search(None, 'UNSEEN SUBJECT "Interac"')
            ids = data[0].split() if data[0] else []

            for msg_id in ids:
                str_id = msg_id.decode()
                if str_id in processed_ids:
                    continue

                _, raw = imap.fetch(msg_id, "(RFC822)")
                msg = email.message_from_bytes(raw[0][1])
                subject = decode_subject(msg)
                received_at = datetime.now(timezone.utc).isoformat()

                sender_name, amount = parse_etransfer_subject(subject)
                if sender_name is None:
                    newly_processed.append(str_id)
                    continue

                log.info("E-transfer: %s  $%.2f", sender_name, amount)
                customer, score = best_customer_match(sender_name, customers)

                if customer and score >= config.FUZZY_MATCH_THRESHOLD:
                    log.info("Matched → %s (score=%.2f)", customer["name"], score)
                    source, customer_id, customer_name = "email_auto", customer["id"], customer["name"]
                else:
                    log.info("No match for '%s' (score=%.2f) — flagging unmatched", sender_name, score)
                    source, customer_id, customer_name = "email_unmatched", None, sender_name

                try:
                    api("POST", "/api/agent/payments", json={
                        "customerId": customer_id,
                        "customerName": customer_name,
                        "amount": amount,
                        "receivedAt": received_at,
                        "source": source,
                        "note": f"Interac e-Transfer — sender: '{sender_name}'",
                    })
                    log.info("Payment saved (%s)", source)
                except Exception:
                    log.error("Failed to save payment:\n%s", traceback.format_exc())

                newly_processed.append(str_id)

    except Exception:
        log.error("IMAP error:\n%s", traceback.format_exc())

    return newly_processed


# ── Sage: ensure customer exists ─────────────────────────────────────────────
def ensure_sage_customer(order: dict) -> bool:
    """
    Checks whether the customer exists in Sage by name. Creates them if not.
    The Sage 'Customer' (Name) field is the business name; 'Contact' is the person's name.
    Returns True if the customer is ready to be invoiced.
    """
    try:
        cust = order["customer"]
        # Use company/business name as the Sage customer name; fall back to contact name
        sage_name = (cust.get("company") or cust.get("name", "")).strip()
        if not sage_name:
            log.warning("Order %s has no customer name — cannot ensure Sage customer", order.get("id"))
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
        log.error("Failed to ensure Sage customer for order %s:\n%s", order.get("id"), traceback.format_exc())
        return False


# ── Sage: create sales invoice ────────────────────────────────────────────────
def create_sage_invoice(order: dict) -> bool:
    """
    Creates a sales invoice in Sage 50 using the SimplySDK SalesJournal.
    Automatically creates the customer in Sage first if they don't exist.
    Items are matched by itemNo (must match Sage inventory part codes).
    """
    try:
        # Ensure customer exists in Sage before opening the journal
        if not ensure_sage_customer(order):
            log.error("Aborting invoice for order %s — could not ensure Sage customer", order.get("id"))
            return False

        cust = order["customer"]
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
    Uses ReceiptsJournal from SimplySDK.ReceivableModule.
    The customer must already exist in Sage.
    """
    try:
        from SimplySDK.ReceivableModule import ReceiptsJournal  # noqa: F401
        rec = SDKInstanceManager.Instance.OpenReceiptsJournal()
        try:
            rec.SelectAPARLedger(payment["customerName"])
            rec.SelectPaidByType("E-Transfer")   # if Sage doesn't have this, try "Cheque"
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


def sync_payments():
    try:
        payments = api("GET", "/api/agent/payments?unsynced=true")
    except Exception:
        log.error("Could not fetch payments:\n%s", traceback.format_exc())
        return

    for payment in payments:
        if not payment.get("customerId"):
            continue  # unmatched — skip until manually assigned in admin dashboard
        ok = record_sage_receipt(payment)
        if ok:
            try:
                api("PATCH", f"/api/agent/payments/{payment['id']}", json={"sageSynced": True})
            except Exception:
                log.error("Could not mark payment %s synced:\n%s", payment["id"], traceback.format_exc())


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    log.info("Gonard Foods Sage agent starting. Poll interval: %ds", config.POLL_INTERVAL_SECONDS)
    load_sage_sdk()
    processed_email_ids: set = set()

    while True:
        # Fetch current customer list for fuzzy name matching
        try:
            customers = api("GET", "/api/agent/customers")
        except Exception:
            log.error("Could not fetch customers — skipping cycle:\n%s", traceback.format_exc())
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        # 1. Email scan
        new_ids = check_email(processed_email_ids, customers)
        processed_email_ids.update(new_ids)

        # 2. Sage sync
        if SAGE_AVAILABLE:
            if open_sage_db():
                try:
                    sync_invoiced_orders()
                    sync_payments()
                finally:
                    close_sage_db()

        log.info("Cycle complete. Sleeping %ds.", config.POLL_INTERVAL_SECONDS)
        time.sleep(config.POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
