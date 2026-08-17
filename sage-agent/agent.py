"""
sage-agent/agent.py
===================
Runs on the company PC. Every poll cycle:

  1. Ensures web-app customers exist in Sage (respecting admin-controlled
     onboarding triage in /admin/customers).
  2. Fetches invoiced orders not yet synced to Sage 50, creates a sales
     invoice in Sage for each one, then marks the order as synced.
  3. Sends invoice emails for fulfilled + Sage-synced orders that haven't
     been emailed yet.

NOTE: Sage 50 does NOT need to be open. The SDK connects to the database file
      directly. However, no other user should be editing the same company file
      at the exact same time the agent is writing (a few seconds per cycle).

Setup:
  1. Edit config.py — fill in all REPLACE_WITH_* values.
  2. pip install -r requirements.txt
  3. python agent.py

Logs go to agent.log in this folder and to the terminal.

NOTE (2026-08-03): Interac e-transfer email scanning/matching and the
pywinauto-based Sage Receipts Journal automation (customer payment posting)
have been removed. That feature is being redesigned from scratch — see
project memory for the history before reintroducing it.
"""

import sys
import time
import logging
import traceback
from datetime import datetime

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
            from SimplySDK.Support import SDKAlert
            try:
                from SimplySDK.Support import AlertResult
            except ImportError:
                # Sage 50 2026 SDK removed AlertResult from SimplySDK.Support — use integer fallback
                class AlertResult:  # type: ignore[no-redef]
                    YES = 1
                    NO = 2
                    CANCEL = 3

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
            log.warning("Sage alert handler could not be installed — Sage alerts will show as UI dialogs.\n%s",
                        traceback.format_exc())

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
            return False
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
def create_sage_invoice(order: dict, customer_by_id: dict) -> bool:
    """
    Creates a sales invoice in Sage 50 using the SimplySDK SalesJournal.
    Items are matched by itemNo (must match Sage inventory part codes).

    Respects the same admin-controlled Sage-onboarding triage as sync_customers():
      "pending" — admin hasn't reviewed this signup yet; hold the invoice (retried
                  next cycle) rather than silently creating them in Sage.
      "linked"  — admin already matched this customer to an existing Sage ledger
                  entry under sageName; use that name directly and do NOT run
                  ensure_sage_customer (it could create a spurious duplicate under
                  the web-app's name instead of matching the real one).
      "new"     — admin confirmed brand-new; ensure_sage_customer creates them.
      no linked Customer record (guest order, or customerId not found) — fall back
                  to the order's own embedded customer info, as before.
    """
    try:
        cust = order["customer"]
        customer = customer_by_id.get(order.get("customerId"))

        if customer and customer.get("sageStatus") == "pending":
            log.info(
                "Order %s: customer '%s' is still 'pending' Sage triage in "
                "/admin/customers — holding invoice until reviewed.",
                order.get("id"), customer.get("company") or customer.get("name", "?"),
            )
            return False

        if customer and customer.get("sageName"):
            # "linked" (or any record an admin has explicitly mapped) — trust the
            # existing Sage ledger name, don't try to create/ensure anything.
            sage_customer_name = customer["sageName"].strip()
        else:
            # "new", or no linked Customer record at all (guest order) — ensure
            # the customer exists in Sage before opening the journal.
            if not ensure_sage_customer(cust):
                log.error("Aborting invoice for order %s — could not ensure Sage customer", order.get("id"))
                return False
            sage_customer_name = (cust.get("company") or cust.get("name", "")).strip()

        sal = SDKInstanceManager.Instance.OpenSalesJournal()
        try:
            sal.SelectTransType(0)                    # 0 = invoice (not order/quote)
            # Deliberately not setting sal.InvoiceNumber — leaving it untouched lets
            # Sage auto-assign the next number in its own sequence, keeping the count
            # meaningful (e.g. 154210 following in-store invoice 154209) instead of
            # stamping in the long web order id.
            sal.SelectAPARLedger(sage_customer_name)  # either the linked sageName, or just-ensured
            sal.SelectPaidByType("Pay Later")         # outstanding balance

            date_str = (order.get("invoicedAt") or datetime.utcnow().isoformat())[:10]
            sal.SetShipDate(date_str)

            for i, item in enumerate(order.get("items", []), start=1):
                sal.SetItemNumber(item.get("itemNo", ""), i)
                sal.SetDescription(item.get("name", ""), i)

                pricing = item.get("pricingType", "per_weight")
                # Sage's SDK hard-rejects currency fields (price, line amount) with
                # more than 2 decimals. price × weight/qty routinely produces more
                # than that in floating point even when the web app already rounds
                # at the source, so round every currency value again here too.
                price = round(item.get("pricePerUnit") or 0, 2)

                if pricing == "per_weight":
                    # Web order qty is the box count, but this pricing type charges
                    # per kg/lb — the invoice quantity must be the boxes' total
                    # weight, not the box count, or the invoice reads wrong.
                    total_weight = item.get("totalWeight") or 0
                    sal.SetQuantity(total_weight, i)
                    sal.SetUnit(item.get("weightUnit", "KG"), i)
                    sal.SetPrice(price, i)
                    sal.SetLineAmount(round(item.get("lineTotal") or 0, 2), i)
                elif pricing == "per_weight_direct":
                    # qty IS the weight for this pricing type (no separate case count)
                    qty = item.get("qty", 1)
                    sal.SetQuantity(qty, i)
                    sal.SetUnit(item.get("weightUnit", "LB"), i)
                    sal.SetPrice(price, i)
                    sal.SetLineAmount(round(price * qty, 2), i)
                else:  # per_box — flat price per box, qty is the box count
                    qty = item.get("qty", 1)
                    sal.SetQuantity(qty, i)
                    sal.SetUnit("Case", i)
                    sal.SetPrice(price, i)
                    sal.SetLineAmount(round(price * qty, 2), i)

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


# ── Sync loops ────────────────────────────────────────────────────────────────
def sync_customers(customers: list):
    """
    Ensures web-app customers exist in Sage, respecting admin-controlled onboarding state:
      "pending"  — admin hasn't decided yet; skip so nothing is created prematurely
      "linked"   — already in Sage; nothing to create
      "new"      — admin confirmed brand-new; ensure_sage_customer creates them if not present
      undefined  — legacy record without sageStatus; create as before (backward compat)
    """
    for customer in customers:
        status = customer.get("sageStatus")
        if status in ("pending", "linked"):
            continue
        # "new" or None → ensure the customer exists in Sage
        ensure_sage_customer(customer)


def sync_invoiced_orders(customers: list):
    try:
        orders = api("GET", "/api/agent/orders?unsynced=true")
    except Exception:
        log.error("Could not fetch orders:\n%s", traceback.format_exc())
        return

    customer_by_id = {c["id"]: c for c in customers}

    for order in orders:
        ok = create_sage_invoice(order, customer_by_id)
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


# ── Main loop ─────────────────────────────────────────────────────────────────
def main():
    log.info("Gonard Foods Sage agent starting. Poll interval: %ds", config.POLL_INTERVAL_SECONDS)
    load_sage_sdk()

    while True:
        # Fetch current customer list (used for Sage-onboarding triage lookups)
        try:
            customers = api("GET", "/api/agent/customers")
        except Exception:
            log.error("Could not fetch customers — skipping cycle:\n%s", traceback.format_exc())
            time.sleep(config.POLL_INTERVAL_SECONDS)
            continue

        # Sage SDK sync — customers/invoices need the DB open
        if SAGE_AVAILABLE:
            if open_sage_db():
                try:
                    sync_customers(customers)
                    sync_invoiced_orders(customers)
                    send_invoice_emails()
                finally:
                    close_sage_db()
            else:
                log.info(
                    "Sage DB unavailable (Sage 50 is likely open under the same username) "
                    "— invoice sync skipped this cycle."
                )

        log.info("Cycle complete. Sleeping %ds.", config.POLL_INTERVAL_SECONDS)
        time.sleep(config.POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
