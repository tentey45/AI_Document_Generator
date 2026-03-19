import os
import sys

# 1. Prioritize internal Lambda directory
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import json
import traceback

# 2. Local Imports for Vercel Bundle Compatibility
try:
    from main import ChatRequest, ChatResponse, chat_endpoint, chat_stream_endpoint
except ImportError as e:
    # Diagnostic for user error reporting
    raise ImportError(f"CRITICAL: Could not find backend logic in Lambda directory. sys.path: {sys.path}. Error: {str(e)}")

# Create FastAPI app for this function
app = FastAPI(title="AGED - AI Document Generator API", version="1.0")

# Global Exception Handler for debugging
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "traceback": traceback.format_exc()
        }
    )

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the chat endpoints with absolute and relative variations
app.post("/api/chat", response_model=ChatResponse)(chat_endpoint)
app.post("/chat", response_model=ChatResponse)(chat_endpoint)
app.post("/", response_model=ChatResponse)(chat_endpoint)

app.post("/api/chat-stream")(chat_stream_endpoint)
app.post("/chat-stream")(chat_stream_endpoint)

# Add health check
@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "AI Assistant API (Vercel Node x Python) is running"}

# Vercel serverless handler
handler = app

# For direct testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
