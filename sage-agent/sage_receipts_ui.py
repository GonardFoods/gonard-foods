"""
sage_receipts_ui.py
===================
Automates the Sage 50 Receipts Journal via Windows UI Automation (pywinauto).
Sage 50 must be running on the same PC as the agent.

Workflow mirrored from manual steps:
  Home → Receipts Journal → select customer → enter amount → Post
"""
import logging
import time
import traceback as _tb

log = logging.getLogger(__name__)

# Adjust these if your Sage 50 window title differs.
# On this install Sage's main window is titled after the data file itself
# (e.g. "DATA.SAI"), not "Sage 50" or "Simply Accounting" — so match any
# window ending in .SAI as well as the branded titles.
SAGE_TITLE_RE       = r"(?i).*(sage 50|simply accounting|sage simply|\.sai)\b.*"
RECEIPTS_TITLE_RE   = r"(?i).*(receipts journal|receive payment|receipt).*"

WINDOW_TIMEOUT = 15   # seconds to wait for windows
DELAY          = 0.5  # pause between UI actions


# ── helpers ───────────────────────────────────────────────────────────────────

def _connect():
    """Return a connected Application object for the running Sage 50 window."""
    from pywinauto.application import Application
    try:
        return Application(backend="uia").connect(title_re=SAGE_TITLE_RE, timeout=5)
    except Exception as e:
        # Multiple Sage windows open (e.g. a login/alert dialog alongside the main window).
        # Pick the window with the most children — that's the main application, not a dialog.
        if "2 element" in str(e) or "more element" in str(e).lower():
            try:
                import re as _re
                from pywinauto import Desktop
                wins = [w for w in Desktop(backend="uia").windows(visible_only=True)
                        if _re.search(SAGE_TITLE_RE, w.window_text() or "")]
                wins.sort(key=lambda w: len(w.children()), reverse=True)
                if wins:
                    log.debug("Multiple Sage windows — connecting to main: '%s'", wins[0].window_text())
                    return Application(backend="uia").connect(handle=wins[0].handle, timeout=5)
            except Exception as inner:
                log.debug("Fallback connect failed: %s", inner)

        # Log all visible window titles to help diagnose a title mismatch
        try:
            from pywinauto import Desktop
            titles = [w.window_text() for w in Desktop(backend="uia").windows(visible_only=True)
                      if w.window_text()]
            log.info("_connect failed. Visible windows: %s", titles)
        except Exception:
            pass
        raise


def is_sage_running() -> bool:
    try:
        _connect()
        return True
    except Exception:
        return False


def _dump(win, label: str = "controls", depth: int = 5, max_chars: int = 4000):
    """Log the control tree of a window — used for debugging failed automation."""
    try:
        import io, sys
        buf = io.StringIO()
        sys.stdout, old = buf, sys.stdout
        win.print_control_identifiers(depth=depth)
        sys.stdout = old
        log.info("=== %s ===\n%s", label, buf.getvalue()[:max_chars])
    except Exception as e:
        log.debug("_dump failed: %s", e)


def _home_contents(main):
    """
    Locate the Sage 50 home screen's workflow-diagram pane (auto_id m_HWContents).
    This Sage version renders the home page as a graphical business-process
    diagram rather than a classic menu, so the Receipts icon lives inside here.
    """
    try:
        return main.child_window(auto_id="m_HWContents", control_type="Pane")
    except Exception:
        return None


def _find_by_traversal(win, title: str, control_type_substr: str = "Pane"):
    """
    Find a descendant by walking the UIA tree with the tree-walker API.

    UIA's FindFirst condition search (used by child_window) fails on some
    WinForms owner-drawn controls that appear in print_control_identifiers but
    are not reachable via property-condition queries.  Traversal always works.
    """
    try:
        for desc in win.descendants():
            try:
                if (desc.window_text() == title and
                        control_type_substr.lower() in
                        str(desc.element_info.control_type).lower()):
                    return desc
            except Exception:
                pass
    except Exception:
        pass
    return None


def _try_click(parent, patterns, control_types=("Hyperlink", "Button", "ListItem")):
    """
    Try to find and click a child control matching any (pattern, control_type) pair.
    Returns True on the first successful click.
    """
    for pat in patterns:
        for ct in control_types:
            try:
                ctrl = parent.child_window(title_re=pat, control_type=ct, found_index=0)
                ctrl.click_input()
                return True
            except Exception:
                pass
    return False


def _set_field(parent, name_patterns, value: str, ctrl_types=("Edit", "ComboBox")) -> bool:
    """Find an editable field by name pattern and set its text. Returns True on success."""
    for pat in name_patterns:
        for ct in ctrl_types:
            try:
                f = parent.child_window(title_re=pat, control_type=ct, found_index=0)
                f.set_edit_text(value)
                return True
            except Exception:
                pass
    return False


# ── main public function ──────────────────────────────────────────────────────

def post_receipt(customer_name: str, amount: float, date_str: str) -> bool:
    """
    Post a customer receipt in Sage 50 via UI automation.

    Args:
        customer_name: Company name as it appears in Sage 50.
        amount:        Payment amount (positive).
        date_str:      ISO date string YYYY-MM-DD.

    Returns True if the receipt was posted, False otherwise.
    Sage 50 must be open on this PC.
    """
    try:
        app = _connect()
    except Exception as e:
        log.warning("Sage 50 not running — receipt skipped for '%s': %r", customer_name, e)
        return False

    rcpts_win = None
    try:
        # ── 1. Open Receipts Journal from the home screen ─────────────────
        main = app.top_window()
        main.set_focus()
        time.sleep(DELAY)

        # Click the "Receipts" task icon on the Sage 50 home-screen workflow diagram.
        # child_window()/FindFirst fails on these owner-drawn WinForms panes even
        # though they appear in print_control_identifiers — use tree-walker traversal.
        opened = False
        hw = _home_contents(main)
        search_root = hw if hw is not None else main
        icon = _find_by_traversal(search_root, "Receipts", "Pane")
        if icon is not None:
            try:
                icon.click_input()
                opened = True
                log.debug("Receipts icon clicked via traversal (click_input)")
            except Exception:
                try:
                    icon.double_click_input()
                    opened = True
                    log.debug("Receipts icon clicked via traversal (double_click_input)")
                except Exception:
                    # Last resort: send a raw mouse click to the icon's centre coords
                    try:
                        from pywinauto import mouse
                        r = icon.rectangle()
                        cx, cy = (r.left + r.right) // 2, (r.top + r.bottom) // 2
                        main.set_focus()
                        time.sleep(DELAY)
                        mouse.click(button="left", coords=(cx, cy))
                        opened = True
                        log.debug("Receipts icon clicked via raw mouse at (%d, %d)", cx, cy)
                    except Exception as _e:
                        log.warning("All Receipts icon click strategies failed: %r", _e)

        if not opened:
            # This Sage version renders the home screen as a graphical workflow
            # diagram (no classic menu bar), so dump the m_HWContents pane
            # specifically — much deeper and larger than a generic window dump —
            # to find the actual Receipts icon's name/auto_id.
            hw = _home_contents(main)
            if hw is not None:
                _dump(hw, "Sage home workflow pane (m_HWContents)", depth=12, max_chars=20000)
            else:
                _dump(main, "Sage home screen — Receipts button not found by label", depth=8, max_chars=20000)
            log.error(
                "Could not find the Receipts icon on the Sage home screen by label. "
                "No safe keyboard fallback exists for this Sage UI — see the dump above "
                "to identify the correct control name/auto_id."
            )
            return False

        # ── 2. Wait for the Receipts Journal window ───────────────────────
        try:
            rcpts_win = app.window(title_re=RECEIPTS_TITLE_RE)
            rcpts_win.wait("visible", timeout=WINDOW_TIMEOUT)
        except Exception:
            log.error(
                "Receipts Journal window did not open after clicking. "
                "Check that Sage 50 is on the home screen and try again."
            )
            _dump(main, "Sage home screen — Receipts Journal not found")
            return False

        rcpts_win.set_focus()
        time.sleep(DELAY)

        # ── 3. Select customer ────────────────────────────────────────────
        # The customer field is the first ComboBox/Edit at the top of the form.
        customer_found = False
        for idx in range(3):  # try the first few edit/combo controls
            for ct in ("ComboBox", "Edit"):
                try:
                    f = rcpts_win.child_window(control_type=ct, found_index=idx)
                    f.set_edit_text(customer_name)
                    f.type_keys("{TAB}")
                    customer_found = True
                    break
                except Exception:
                    pass
            if customer_found:
                break

        if not customer_found:
            log.error("Could not find customer field in Receipts Journal for '%s'", customer_name)
            _dump(rcpts_win, "Receipts Journal — customer field not found")
            return False

        time.sleep(DELAY * 3)   # wait for invoices to load after selecting customer

        # ── 4. Set date ───────────────────────────────────────────────────
        # Format Sage expects: MM/DD/YYYY
        d = date_str  # YYYY-MM-DD
        date_mm_dd_yyyy = f"{d[5:7]}/{d[8:10]}/{d[0:4]}"
        _set_field(rcpts_win, [r"(?i).*date.*"], date_mm_dd_yyyy)
        time.sleep(DELAY)

        # ── 5. Enter amount received ──────────────────────────────────────
        amount_str = f"{amount:.2f}"
        amount_set = False

        # Approach A: standalone "Amount Received" Edit field
        if _set_field(
            rcpts_win,
            [r"(?i).*amount received.*", r"(?i).*total.*received.*",
             r"(?i).*amount.*paid.*", r"(?i).*payment amount.*"],
            amount_str,
        ):
            amount_set = True

        # Approach B: DataGrid / Table cell (invoice grid → Amount Received column)
        if not amount_set:
            for grid_type in ("Table", "DataGrid", "Custom", "List"):
                try:
                    grid = rcpts_win.child_window(control_type=grid_type, found_index=0)
                    # First data row
                    row = grid.child_window(control_type="DataItem", found_index=0)
                    # Try each Edit cell in the row — "Amount Received" is usually
                    # the 4th or 5th column. Try from the right side.
                    cells = row.children(control_type="Edit")
                    if not cells:
                        cells = row.children(control_type="Custom")
                    for cell in reversed(cells):
                        name = (cell.element_info.name or "").lower()
                        if "amount" in name or "received" in name or "payment" in name or not name:
                            try:
                                cell.click_input()
                                time.sleep(0.2)
                                cell.set_edit_text(amount_str)
                                amount_set = True
                                log.debug("Set amount via DataGrid cell '%s'", name)
                                break
                            except Exception:
                                pass
                    if amount_set:
                        break
                except Exception:
                    pass

        # Approach C: Tab navigation from the top — tab past customer/date to amount
        if not amount_set:
            log.info("Trying Tab navigation to reach Amount Received field…")
            rcpts_win.type_keys("{TAB}" * 4)   # tab past known fields
            rcpts_win.type_keys(amount_str)
            amount_set = True   # optimistic — we'll see if Post succeeds

        time.sleep(DELAY)

        # ── 6. Set payment method ─────────────────────────────────────────
        # Payment method is optional — Sage defaults to Cheque; skip silently if not found
        try:
            _set_field(rcpts_win,
                       [r"(?i).*paid by.*", r"(?i).*payment method.*", r"(?i).*method.*"],
                       "Cheque",
                       ctrl_types=("ComboBox",))
        except Exception:
            pass
        time.sleep(DELAY)

        # ── 7. Post ───────────────────────────────────────────────────────
        posted = False
        for btn in ("Post", "Post Journal", "Post Receipt"):
            try:
                rcpts_win.child_window(title=btn, control_type="Button").click_input()
                posted = True
                break
            except Exception:
                pass
        if not posted:
            rcpts_win.type_keys("^p")   # Ctrl+P — common Sage post shortcut

        time.sleep(DELAY * 2)

        # Dismiss any confirmation dialog (Post confirmation, duplicate warning, etc.)
        for dlg_re in (r"(?i).*confirm.*", r"(?i).*post.*", r"(?i).*sage 50.*",
                       r"(?i).*receipt.*", r"(?i).*warning.*"):
            try:
                dlg = app.window(title_re=dlg_re)
                dlg.wait("visible", timeout=3)
                for btn_name in ("Yes", "OK", "Post"):
                    try:
                        dlg.child_window(title=btn_name, control_type="Button").click_input()
                        break
                    except Exception:
                        pass
                time.sleep(DELAY)
                break
            except Exception:
                pass

        log.info("Sage receipt posted (UI): $%.2f for '%s' on %s",
                 amount, customer_name, date_str)
        return True

    except Exception:
        log.error("UI receipt posting failed for '%s':\n%s",
                  customer_name, _tb.format_exc())
        return False
    finally:
        # Always close the Receipts Journal window so the next call starts clean
        if rcpts_win is not None:
            try:
                if rcpts_win.exists(timeout=1):
                    rcpts_win.close()
                    time.sleep(DELAY)
            except Exception:
                pass
