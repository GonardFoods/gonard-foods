# Sage Agent

Runs on the sysadmin PC. Monitors email for Interac e-transfers and syncs invoiced orders to Sage 50.

## Setup

```
cd sage-agent
pip install -r requirements.txt
```

Edit `config.py` and replace all `REPLACE_WITH_*` values:

| Setting | Where to find it |
|---|---|
| `WEB_APP_URL` | Your Vercel deployment URL |
| `AGENT_KEY` | `SAGE_AGENT_KEY` env var on Vercel |
| `IMAP_PASSWORD` | Google App Password (Security → 2-Step → App Passwords) |
| `SAGE_PROG_ID` | Sage 50 SDK documentation (shipped with the SDK install) |
| `SAGE_COMPANY_FILE` | File path shown in Sage under File → Open Company |

## Running

```
python agent.py
```

Logs are written to `agent.log` in the same folder and printed to the terminal.

## How it works

Every 60 seconds the agent:
1. Scans the inbox for unread Interac e-Transfer emails
2. Parses sender name + amount from the subject line
3. Fuzzy-matches the sender name against customer records
   - Score ≥ 0.75 → payment auto-applied to customer, balance reduced
   - Score < 0.75 → saved as "unmatched" — appears in admin dashboard for manual assignment
4. Queries the web app for invoiced orders not yet synced to Sage
5. Creates a sales invoice in Sage 50 for each one
6. Records matched e-transfer payments as customer receipts in Sage

## Sage SDK

The SDK is installed as part of Sage 50. Documentation is usually at:
```
C:\Program Files (x86)\Sage\Sage 50 Accounting\SDK\
```

Check `SAGE_PROG_ID` in the SDK help file — common values are `Sage50CDN.Application` or `Sage50.Application`.

The agent calls `win32com.client.GetActiveObject(SAGE_PROG_ID)` so Sage must be open with the company file already loaded when the agent runs.
