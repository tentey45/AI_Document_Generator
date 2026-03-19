import os
import sys

# 1. Improved path resolution for Vercel functions
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
backend_path = os.path.join(parent_dir, 'backend')

if backend_path not in sys.path:
    sys.path.append(backend_path)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json

# 2. Flexible imports to handle different deployment environments
try:
    from main import ChatRequest, ChatResponse, chat_endpoint, chat_stream_endpoint
except ImportError as e:
    print(f"IMPORT ERROR: Failed to import from main.py: {str(e)}")
    # Fallback to local import if path is different
    try:
        from backend.main import ChatRequest, ChatResponse, chat_endpoint, chat_stream_endpoint
    except ImportError:
        raise ImportError(f"CRITICAL: Could not find backend logic. sys.path: {sys.path}")

from fastapi.responses import JSONResponse
import traceback

# Create FastAPI app for this function
app = FastAPI(title="AGED - AI Document Generator API", version="1.0")

# Global Exception Handler for Vercel Debugging
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": str(exc),
            "traceback": traceback.format_exc(),
            "sys_path": sys.path,
            "current_dir": os.getcwd()
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

# Add the chat endpoints with multiple path variations to handle Vercel proxying
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
    return {"message": "AI Assistant API is running"}

# Vercel serverless handler
handler = app

# For direct testing
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
