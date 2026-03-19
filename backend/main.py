import os
import sys

# Add the current (backend) directory to the Python path so it can find its modules
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

try:
    from backend.ai_service import generate_document_v2, generate_assistant_response, generate_assistant_streaming
except ImportError:
    from ai_service import generate_document_v2, generate_assistant_response, generate_assistant_streaming


app = FastAPI(title="AI Document Generator (Groq)")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's natural language message")
    user_context: str = Field(default="general", description="User type: developer, student, general")
    preferences: dict = Field(default={}, description="Optional user preferences")


class ChatResponse(BaseModel):
    detected_mode: str = Field(..., description="AI detected response mode")
    content: str = Field(..., description="Generated response content")
    next_actions: list[str] = Field(default=[], description="Suggested next steps")
    meta: dict = Field(default={}, description="Metadata about the response")


@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        # Import dynamically to prevent crashes at startup
        from config import GROQ_API_KEY
        if not GROQ_API_KEY:
            raise HTTPException(
                status_code=500, 
                detail={"error": "Configuration Error", "message": "GROQ_API_KEY not configured."}
            )
        
        # Call enhanced AI service
        result = generate_assistant_response(
            message=message,
            user_context=payload.user_context,
            doc_style=payload.preferences.get("doc_style", "professional"),
            language=payload.preferences.get("language", "auto"),
            doc_type=payload.preferences.get("doc_type", "auto")
        )
        
        # If result itself indicates an error, handle gracefully
        if "error" in result:
             raise HTTPException(status_code=500, detail={"error": result["error"], "message": result["message"] if "message" in result else result["content"]})
             
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Critical error in chat_endpoint: {str(e)}")
        # FORCED JSON ERROR RESPONSE
        raise HTTPException(
            status_code=500, 
            detail={"error": "Internal Backend Failure", "detail": str(e)}
        )


@app.post("/chat-stream")
def chat_stream_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Generator wrapper to handle stream formatting if needed
    def event_stream():
        try:
            for chunk in generate_assistant_streaming(
                message=message,
                user_context=payload.user_context,
                doc_style=payload.preferences.get("doc_style", "professional"),
                language=payload.preferences.get("language", "auto"),
                doc_type=payload.preferences.get("doc_type", "auto")
            ):
                yield chunk
        except Exception as e:
            yield f"\n[Backend Error: {str(e)}]"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
@app.get("/")
def root():
    return {"message": "AI Assistant API is running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Vercel serverless handler
handler = app

