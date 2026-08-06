# Sage Agent

Runs on the company PC. Syncs web-app customers and invoiced orders to Sage 50.

**Sage does not need to be open.** The SDK connects to the database file directly.

## Setup

```
cd sage-agent
pip install -r requirements.txt
copy config.example.py config.py
```

`config.py` holds real secrets and a machine-specific path — it is gitignored on
purpose and must never be replaced by copying files from a fresh checkout of this
repo. If you're setting up a new machine or replacing files, only copy
`config.example.py` in as a template; leave an existing `config.py` alone, or you'll
overwrite real credentials with placeholders (this happened once already — see
`agent.log` around 2026-08-06 for what that looks like: an SDK "file not found" error
and a 401 from the web app).

Edit `config.py` — fill in all `REPLACE_WITH_*` values:

| Setting | Where to find it |
|---|---|
| `WEB_APP_URL` | Your Vercel deployment URL |
| `AGENT_KEY` | `SAGE_AGENT_KEY` env var on Vercel |
| `SAGE_SDK_PATH` | Folder containing `Sage_SA.SDK.dll` (the SDK you downloaded) |
| `SAGE_COMPANY_FILE` | Full path to your `.SAI` file (shown in Sage: File → Open Company → look at the title bar) |
| `SAGE_USERNAME` | Your Sage 50 login username |
| `SAGE_PASSWORD` | Your Sage 50 login password |

## Running

```
python agent.py
```

Logs are written to `agent.log` in the same folder and printed to the terminal.
Leave the terminal window open during office hours, or set up a Windows Task Scheduler task to run it automatically.

## How it works

Every 60 seconds the agent:

1. Ensures web-app customers exist in Sage, respecting the admin-controlled onboarding triage in `/admin/customers` (`pending` / `linked` / `new`)
2. Fetches invoiced orders not yet synced to Sage
3. Creates a sales invoice in Sage 50 for each one (customer + line items)
4. Sends invoice emails for fulfilled + Sage-synced orders that haven't been emailed yet

## Sage customer names

Customer names in Sage **must match exactly** (case-insensitive) the names entered in the web app, unless an admin has explicitly linked a customer to a different existing Sage ledger name via `sageName` in `/admin/customers`.

## Troubleshooting

- **Sage sync not working**: check `agent.log` for errors. Common causes: wrong `SAGE_COMPANY_FILE` path, wrong credentials, or the `.SAI` file is open exclusively by another program.

## Not currently implemented

Interac e-transfer email scanning/matching and automated Sage Receipts Journal
payment posting (pywinauto UI automation) were removed 2026-08-03 and are being
redesigned from scratch. See project memory for the history before
reintroducing either.
