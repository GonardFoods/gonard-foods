# sage-agent/config.py
# Fill in all REPLACE_WITH_* values before running agent.py.

# --- Web app ---
WEB_APP_URL = "https://gonard-foods.vercel.app"  # no trailing slash
AGENT_KEY = "REPLACE_WITH_SAGE_AGENT_KEY"         # matches SAGE_AGENT_KEY env var on Vercel

# --- IMAP (Google Workspace / Gmail) ---
IMAP_HOST = "imap.gmail.com"
IMAP_PORT = 993
IMAP_USER = "gfoods@telus.net"
IMAP_PASSWORD = "REPLACE_WITH_APP_PASSWORD"        # 16-char Google App Password

# --- Fuzzy matching ---
# Minimum similarity score (0–1) to auto-apply a payment.
# Below this, the payment is saved as unmatched for manual review in the admin dashboard.
FUZZY_MATCH_THRESHOLD = 0.75

# --- Sage 50 SDK ---
# Path to the SDK folder (the one containing Sage_SA.SDK.dll).
# On the company PC this is wherever you installed or copied the SDK.
SAGE_SDK_PATH = r"C:\Sage Agent\SDK"   # <-- update to wherever your SDK folder is

# Path to your Sage 50 company file (.SAI)
SAGE_COMPANY_FILE = r"C:\Users\gfood\Documents\Simply\GonardFoods.SAI"  # <-- update this

# Sage 50 login credentials (the username/password you use to log into Sage)
SAGE_USERNAME = "sysadmin"             # <-- your Sage username
SAGE_PASSWORD = "REPLACE_WITH_SAGE_PASSWORD"

# --- Polling ---
POLL_INTERVAL_SECONDS = 60
