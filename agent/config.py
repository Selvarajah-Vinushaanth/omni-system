# OmniControl Configuration Example
# Copy this file to config.py and update with your actual values

# Gemini AI Configuration
GEMINI_API_KEY = "###############################"

# To get your Gemini API key:
# 1. Go to https://makersuite.google.com/app/apikey
# 2. Create a new API key
# 3. Replace the value above with your actual key
# 4. Copy this file to config.py in the same directory

# Server Configuration
SERVER_URL = "wss://omni-backend-603531145334.asia-south1.run.app/ws/agent"
SERVER_PORT = 8080

# Dashboard Configuration  
DASHBOARD_PORT = 5173

# Feature Toggles
AI_ENABLED = True
SCREENSHOT_ENABLED = True
POWER_MANAGEMENT_ENABLED = True  # Set to False for safety in production