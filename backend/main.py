from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_service import generate_document_v2, generate_assistant_response


app = FastAPI(title="AI Document Generator (Groq)")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
        # Extract preferences
        doc_style = payload.preferences.get("doc_style", "professional")
        language = payload.preferences.get("language", "auto")
        doc_type = payload.preferences.get("doc_type", "auto")
        
        # Call enhanced AI service
        result = generate_assistant_response(
            message=message,
            user_context=payload.user_context,
            doc_style=doc_style,
            language=language,
            doc_type=doc_type
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

