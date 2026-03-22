import os
import sys
import time
import json

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


SESSIONS_DIR = "sessions"
os.makedirs(SESSIONS_DIR, exist_ok=True)

def get_session_path(session_id: str):
    return os.path.join(SESSIONS_DIR, f"{session_id}.json")

def get_session(session_id: str):
    path = get_session_path(session_id)
    if not os.path.exists(path):
        return {"messages": [], "persona": "general"}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading session {session_id}: {e}")
        return {"messages": [], "persona": "general"}

def save_session(session_id: str, history: list, persona: str):
    path = get_session_path(session_id)
    data = {
        "session_id": session_id, 
        "messages": history[-30:], 
        "persona": persona, 
        "updated_at": time.time()
    }
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
            f.flush()
            os.fsync(f.fileno())
    except Exception as e:
        print(f"Failed to save session {session_id}: {e}")

@app.get("/sessions")
def list_sessions(persona: str = None):
    sessions = []
    for f in os.listdir(SESSIONS_DIR):
        if f.endswith(".json"):
            try:
                with open(os.path.join(SESSIONS_DIR, f), "r") as sfile:
                    data = json.load(sfile)
                    if not persona or data.get("persona") == persona:
                        title = "New Chat"
                        for m in data.get("messages", []):
                            if m["role"] == "user":
                                title = m["content"][:40] + "..."
                                break
                        sessions.append({
                            "id": data.get("session_id", f.replace(".json", "")),
                            "title": title,
                            "persona": data.get("persona"),
                            "updated_at": data.get("updated_at", 0)
                        })
            except: continue
    return sorted(sessions, key=lambda x: x["updated_at"], reverse=True)

@app.get("/sessions/{session_id}")
def fetch_session(session_id: str):
    return get_session(session_id)

@app.delete("/sessions/{session_id}")
def remove_session(session_id: str):
    path = get_session_path(session_id)
    if os.path.exists(path):
        os.remove(path)
    return {"message": "Session deleted."}

class ChatResponse(BaseModel):
    detected_mode: str = Field(default="conversation", description="AI detected response mode")
    content: str = Field(..., description="Generated response content")
    next_actions: list[str] = Field(default=[], description="Suggested next steps")
    meta: dict = Field(default={}, description="Metadata about the response")

class ChatRequest(BaseModel):
    message: str = Field(..., description="User's natural language message")
    user_context: str = Field(default="general", description="User type: developer, learner")
    session_id: str = Field(default="default", description="Session ID")
    preferences: dict = Field(default={}, description="Optional preferences")

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message: raise HTTPException(status_code=400, detail="Empty message.")
    
    session_data = get_session(payload.session_id)
    current_history = session_data.get("messages", [])

    try:
        from config import GROQ_API_KEY
        if not GROQ_API_KEY: raise HTTPException(status_code=500, detail="GROQ_API_KEY missing")
        
        result = generate_assistant_response(
            message=message,
            history=current_history,
            user_context=payload.user_context,
            doc_style=payload.preferences.get("doc_style", "professional")
        )
        
        if "error" in result: raise HTTPException(status_code=500, detail=result)
        
        current_history.append({"role": "user", "content": message})
        current_history.append({"role": "assistant", "content": result.get("content", "")})
        save_session(payload.session_id, current_history, payload.user_context)
             
        return result
    except HTTPException:
        raise
    except Exception as e:
        print(f"Critical error in chat_endpoint: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail={"error": "Internal Backend Failure", "detail": str(e)}
        )


@app.post("/chat-stream")
def chat_stream_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    session_data = get_session(payload.session_id)
    current_history = session_data.get("messages", [])
    full_response = []

    # Generator wrapper
    def event_stream():
        try:
            for chunk in generate_assistant_streaming(
                message=message,
                history=current_history,
                user_context=payload.user_context,
                doc_style=payload.preferences.get("doc_style", "professional"),
                language=payload.preferences.get("language", "auto"),
                doc_type=payload.preferences.get("doc_type", "auto")
            ):
                full_response.append(chunk)
                yield chunk
            
            # Persist after stream
            current_history.append({"role": "user", "content": message})
            current_history.append({"role": "assistant", "content": "".join(full_response)})
            save_session(payload.session_id, current_history, payload.user_context)
            
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

