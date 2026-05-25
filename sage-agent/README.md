# Sage Agent

Runs on the company PC. Monitors email for Interac e-transfers and syncs invoiced orders to Sage 50.

**Sage does not need to be open.** The SDK connects to the database file directly.

## Setup

```
cd sage-agent
pip install -r requirements.txt
```

Edit `config.py` — fill in all `REPLACE_WITH_*` values:

| Setting | Where to find it |
|---|---|
| `WEB_APP_URL` | Your Vercel deployment URL |
| `AGENT_KEY` | `SAGE_AGENT_KEY` env var on Vercel |
| `IMAP_PASSWORD` | 16-char Google App Password |
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

1. Scans the inbox for unread Interac e-Transfer emails
2. Parses sender name + amount from the subject line
3. Fuzzy-matches the sender name to a customer record (threshold: 75% similarity)
   - High confidence → payment auto-applied, customer balance reduced
   - Low confidence → saved as "unmatched" → appears in admin dashboard for manual assignment
4. Fetches invoiced orders not yet synced to Sage
5. Creates a sales invoice in Sage 50 for each one (customer + line items)
6. Records matched e-transfer payments as customer receipts in Sage

## Sage customer names

Customer names in Sage **must match exactly** (case-insensitive) the names entered in the web app.  
If a customer is called "ABC Meats Ltd" in Sage, they must be registered the same way on the website.

## Troubleshooting

- **Sage sync not working**: check `agent.log` for errors. Common causes: wrong `SAGE_COMPANY_FILE` path, wrong credentials, or the `.SAI` file is open exclusively by another program.
- **E-transfers not detected**: make sure IMAP is enabled on the Gmail account and the App Password is correct.
- **Wrong customer matched**: lower `FUZZY_MATCH_THRESHOLD` in `config.py` to be more lenient, or raise it to be stricter.
