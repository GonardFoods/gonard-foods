# sage-agent/config.py
# Copy this file and fill in your values. Never commit secrets.

# --- Web app ---
WEB_APP_URL = "https://gonard-foods.vercel.app"  # no trailing slash
AGENT_KEY = "REPLACE_WITH_SAGE_AGENT_KEY"         # matches SAGE_AGENT_KEY env var on Vercel

# --- IMAP (Google Workspace / Gmail) ---
IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993
IMAP_USER = "gfoods@telus.net"
IMAP_PASSWORD = "REPLACE_WITH_APP_PASSWORD"        # 16-char Google App Password
IMAP_FOLDER = "INBOX"

# --- Fuzzy matching ---
# Minimum similarity ratio (0–1) to auto-apply a payment to a customer.
# Below this threshold the payment is saved as unmatched for manual review.
FUZZY_MATCH_THRESHOLD = 0.75

# --- Sage 50 ---
# The Sage SDK ProgID is listed in the SDK documentation that came with your installation.
# Common values: "Sage50.Application", "Sage50CDN.Application" — verify in your SDK docs.
SAGE_PROG_ID = "Sage50CDN.Application"   # <-- verify against your installed SDK

# Company file path opened in Sage (as shown in File > Open Company)
SAGE_COMPANY_FILE = r"C:\Sage\Gonard Foods\GonardFoods.SAI"  # <-- replace with your actual path

# --- Polling interval ---
POLL_INTERVAL_SECONDS = 60   # how often the agent checks email and the web app
