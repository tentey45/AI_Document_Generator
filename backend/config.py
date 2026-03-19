import os

from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# WARNING: Don't raise RuntimeError at import time as it crashes the serverless function on Vercel/proxies
# before valid JSON can be returned to the frontend.
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY is not set. AI services will return JSON error responses.")
# Don't raise error in production, let it fail gracefully
