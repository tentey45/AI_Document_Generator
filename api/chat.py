import sys
import os

# Add backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json

# Import your existing functions
from main import ChatRequest, ChatResponse, chat_endpoint

# Create FastAPI app for this function
app = FastAPI(title="AGED - AI Document Generator API", version="1.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the chat endpoints
app.post("/chat", response_model=ChatResponse)(chat_endpoint)
app.post("/", response_model=ChatResponse)(chat_endpoint)

# Import the stream handler from backend.main
try:
    from main import chat_stream_endpoint
    app.post("/chat-stream")(chat_stream_endpoint)
    app.options("/chat-stream")(lambda: {"message": "ok"}) # Explicit CORS help for streams
except ImportError:
    print("Warning: chat_stream_endpoint not found in backend.main")

# Add health check
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/")
def root():
    return {"message": "AI Assistant API is running"}

# Vercel serverless handler
handler = app

# For direct testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
