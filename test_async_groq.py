import sys
import asyncio
from groq import AsyncGroq
import os

async def main():
    client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY", "fake_key"))
    print("AsyncGroq initialized")

asyncio.run(main())
