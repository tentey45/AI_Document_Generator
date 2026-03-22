import os
import sys
import json
import traceback
import time
from groq import AsyncGroq
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# 1. INTEGRATED CONFIGURATION
try:
    from dotenv import load_dotenv
    # Try multiple common locations for .env
    load_dotenv() # Default (.)
    load_dotenv("backend/.env") # Relative to backend
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env")) # Correct for lambda paths
except ImportError:
    print("Warning: python-dotenv not installed. Skipping local environment loading.")

# Vercel environment variables are preferred
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 1.5 PERSISTENT STORAGE (SUPABASE) - Optional
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase_client = None

if SUPABASE_URL and SUPABASE_KEY:
    try:
        from supabase import create_client
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    except:
        print("Warning: Supabase client library not found or initialization failed.")

# 2. INTEGRATED SCHEMAS
class ChatRequest(BaseModel):
    message: str = Field(..., description="User's natural language message")
    user_context: str = Field(default="general", description="User type: developer, learner, general")
    preferences: dict = Field(default={}, description="Optional user preferences")

class ChatResponse(BaseModel):
    detected_mode: str = Field(..., description="AI detected response mode")
    content: str = Field(..., description="Generated response content")
    next_actions: list[str] = Field(default=[], description="Suggested next steps")
    meta: dict = Field(default={}, description="Metadata about the response")

# 3. INTEGRATED AI LOGIC
STABLE_MODEL = "llama-3.3-70b-versatile"

PERSONAS = {
    "developer": (
        "You are an Elite Developer Advocate and Technical Writer. You understand the profound needs of software engineers. "
        "When generating documentation, follow these principles: "
        "- Detail is preferred over brevity ('Too long is better than too short'). "
        "- Structure must be logical and exhaustive. "
        "- For READMEs, prioritize: Name, Description, Badges, Visuals, Installation, Usage, Support, Roadmap, Contributing, Authors, License, and Project Status. "
        "- Use technical, precise language."
    ),
    "learner": (
        "You are a Senior Code Mentor specializing in deep technical discovery. "
        "Your goal is to help students 'feel' and understand how code works at a fundamental level. "
        "When generating explanations, focus on: "
        "- Breaking down complex logic line-by-line. "
        "- Explaining the 'Why' behind architectural choices. "
        "- Providing analogies and tutorials."
    )
}

TEMPLATES = {
    "chat_guidance": "Provide strategic guidance using first-principles reasoning.",
    "code_documentation": "Provide technically exhaustive mappings of code architecture.",
    "document_generation": "Engineer high-fidelity professional-grade documentation.",
    "code_generation": "Design production-ready software components.",
    "website_generation": "Architect premium UI/UX components.",
    "rewrite_improve": "Perform editorial refinement for linguistic impact."
}

def log_interaction(prompt, response, user_context="general"):
    """Log an interaction to console (for hosting logs) and local file."""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] [Context: {user_context}]\nUSER: {prompt}\nAGED: {response}\n{'-'*50}\n"
    
    # 1. Print to console: This is CRITICAL for Vercel Hosting logs visibility
    print(f"\n--- HOSTING INTERACTION LOG ---\n{log_entry}")
    
    # 2. Try to write to local file (works in local dev or environments with persistent storage)
    try:
        with open("user_prompts.log", "a", encoding="utf-8") as f:
            f.write(log_entry)
    except:
        pass

    # 3. PERSISTENT STORAGE (SUPABASE) - For Website Hosting Logs
    if supabase_client:
        try:
            supabase_client.table("interactions").insert({
                "context": user_context,
                "prompt": prompt,
                "response": response
            }).execute()
        except Exception as e:
            print(f"Supabase Log Error: {e}")

def get_groq_client():
    if not GROQ_API_KEY:
        return None
    try:
        return AsyncGroq(api_key=GROQ_API_KEY)
    except:
        return None

async def generate_assistant_streaming(message: str, user_context: str = "general", doc_style: str = "professional", doc_type: str = "auto"):
    persona_base = PERSONAS.get(user_context, PERSONAS["developer"])
    expert_persona = TEMPLATES.get("chat_guidance", "Strategic guidance")
    
    system_message = f"""You are AGED (AI Document Architect & Assistant).
Your persona mode is: {user_context.upper()} (User type: {persona_base})

CRITICAL REASONING PROTOCOL:
1. FIRST, analyze the USER INPUT: '{message}'
2. MANDATORY: You must start your response with a concise 1-2 line "Intent Analysis" wrapped in <intent> tags.
   Format: <intent>I understand you want to [briefly restate intent and planned structure].</intent>
3. IF the input is random keystrokes, gibberish, or incomprehensible (e.g., "sdfgsdfg", "asdf"), you MUST respond EXACTLY with: <intent>I'm trying to interpret your input, but it seems unclear.</intent>I could not understand that. What would you like me to do?
4. ELSE IF the input is a casual conversation, greeting, or question (e.g., "hello", "what can you do?", "help me understand X"), provide the <intent> tag then respond in a helpful, conversational manner matching your persona.
5. ELSE IF the input is a request to GENERATE A DOCUMENT, CODE, or OUTLINE, provide the <intent> tag then engineer high-fidelity professional-grade documentation following the preferred style guidelines for the {user_context.upper()} persona.
6. ALWAYS maintain a premium, helpful, and highly intelligent tone.
7. AT THE VERY END of your response, provide exactly three actionable next steps under the heading '**Next Steps:**'."""

    client = get_groq_client()
    if not client:
        yield "Error: Groq client not initialized. Check GROQ_API_KEY in Vercel settings."
        return

    try:
        completion = await client.chat.completions.create(
            model=STABLE_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"USER INPUT: {message}"},
            ],
            temperature=1,
            max_tokens=8192,
            top_p=1,
            stream=True
        )
        async for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content
    except Exception as e:
        yield f"Stream Error: {str(e)}"

# 4. INTEGRATED FASTAPI APP
app = FastAPI(title="AGED AI CORE (INTEGRATED)")

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Integrated Engine Failure",
            "message": str(exc),
            "traceback": traceback.format_exc()
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/chat-stream")
@app.post("/chat-stream")
async def chat_stream_endpoint(payload: ChatRequest):
    message = (payload.message or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message empty.")

    async def event_stream():
        full_response = []
        async for chunk in generate_assistant_streaming(
            message=message,
            user_context=payload.user_context,
            doc_type=payload.preferences.get("doc_type", "auto")
        ):
            full_response.append(chunk)
            yield chunk
        
        # Log after the stream completes
        log_interaction(message, "".join(full_response), payload.user_context)

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.get("/api/health")
@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "integrated-v4"}

@app.get("/")
def root():
    return {"message": "AGED AI Integrated Core is ONLINE"}

# Vercel finds the 'app' variable automatically for FastAPI
