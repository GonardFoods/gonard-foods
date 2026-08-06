# sage-agent/config.example.py
# Copy this to config.py (gitignored) and fill in all REPLACE_WITH_* values
# before running agent.py. Never overwrite an existing config.py with this file.

# --- Web app ---
WEB_APP_URL = "https://gonard-foods.vercel.app"  # no trailing slash
AGENT_KEY = "REPLACE_WITH_SAGE_AGENT_KEY"         # matches SAGE_AGENT_KEY env var on Vercel

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
