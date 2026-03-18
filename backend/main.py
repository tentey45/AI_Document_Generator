from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_service import generate_document


app = FastAPI(title="AI Document Generator (Groq)")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateDocumentRequest(BaseModel):
    prompt: str = Field(..., description="What document to generate")
    user_type: str = Field(default="developer", description="Type of user (Developer or Student)")
    sub_option: str = Field(default="auto", description="Programming language, document type, or 'auto'")
    doc_style: str = Field(default="developer", description="Writing style (professional, developer, simplified)")


class GenerateDocumentResponse(BaseModel):
    content: str


@app.post("/generate-document", response_model=GenerateDocumentResponse)
def generate_document_endpoint(payload: GenerateDocumentRequest) -> GenerateDocumentResponse:
    prompt = (payload.prompt or "").strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt must not be empty.")

    try:
        content = generate_document(
            prompt=prompt, 
            user_type=(payload.user_type or "developer"), 
            sub_option=(payload.sub_option or "auto"),
            doc_style=(payload.doc_style or "developer")
        )
        return GenerateDocumentResponse(content=content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))