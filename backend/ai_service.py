from groq import Groq
import json
import os

MODEL = "llama-3.3-70b-versatile"

def get_groq_client():
    """Lazy-initializes the Groq client only when needed during a request."""
    from config import GROQ_API_KEY
    if not GROQ_API_KEY:
        return None
    
    try:
        # Initializing client here ensures no import-time crashes due to dependencies or missing keys
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Failed to initialize Groq client: {str(e)}")
        return None

# 1. ORCHESTRATOR SYSTEM PROMPT (The "Router")
ROUTER_PROMPT = (
    """Analyze the user's input and determine the correct response mode. 
    Respond ONLY with a JSON object: { "mode": "...", "detected_language": "...", "is_technical": boolean, "intent_confidence": float }

    MODES:
    - chat_guidance: General questions, advice, conversational tutoring, or clarifying chat.
    - code_documentation: Technical explanation of existing code (e.g., "Explain what this function does").
    - document_generation: Creating academic documents, professional proposals, or defense documentation from scratch.
    - code_generation: Writing new code, scripts, or building functional components (e.g., "Write a scraper in Python").
    - website_generation: Building high-fidelity HTML/CSS/JS components or frontend layouts.
    - rewrite_improve: Polishing existing text, refactoring code, or fixing grammar/clarity."""
)

# 2. SPECIALIZED TEMPLATES (Assistant Personas)
TEMPLATES = {
    "chat_guidance": "You are a highly intelligent and friendly AI Mentor. Your goal is to guide the user, explain concepts clearly, and be conversational. Don't just give answers—help them think.",
    "code_documentation": "You are a Senior Technical Writer. Provide a clear, structured documentation of the provided code. Include: Overview, Complexity Analysis, Parameters, and Implementation Details.",
    "document_generation": "You are a Professional Document Strategist. Create formal, well-structured documents (proposals, research papers, etc.). Use GFM (GitHub Flavored Markdown) and maintain a top-tier professional tone.",
    "code_generation": "You are a Lead Software Engineer. Generate clean, production-ready, and efficient code. Explain your architectural choices and how the user should implement it.",
    "website_generation": "You are a Modern UI/UX Designer. Create premium, high-fidelity HTML/CSS components or layouts. Focus on modern aesthetics, responsiveness, and clean code.",
    "rewrite_improve": "You are an Expert Editor. Analyze the provided content first, then provide a polished version. Explain WHY you made specific changes to improve grammar, flow, or efficiency."
}

def detect_intent(prompt: str) -> dict:
    """Internal LLM call to categorize the user's request with a router prompt."""
    client = get_groq_client()
    if not client:
        return {"mode": "chat_guidance", "detected_language": "auto", "is_technical": False, "intent_confidence": 0.5}

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": ROUTER_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error in detect_intent: {str(e)}")
        return {"mode": "chat_guidance", "detected_language": "auto", "is_technical": False, "intent_confidence": 0.5}

def generate_assistant_response(message: str, user_context: str = "general", doc_style: str = "professional", language: str = "auto", doc_type: str = "auto") -> dict:
    """Claude-like assistant: Understands intent -> Chooses mode -> Generates adaptive response -> Suggests next actions"""
    
    # 1. Enhanced Intent Detection
    intent_data = detect_intent(message)
    mode = intent_data.get("mode", "chat_guidance")
    
    # 2. Context-aware Mode Adjustment
    if user_context == "developer" and mode in ["document_generation", "chat_guidance"]:
        if any(keyword in message.lower() for keyword in ["explain", "document", "how does"]):
            mode = "code_documentation"
    elif user_context == "student" and mode == "code_generation":
        if any(keyword in message.lower() for keyword in ["paper", "essay", "report"]):
            mode = "document_generation"
    
    # 3. Select Specialized System Prompt with Context
    expert_persona = TEMPLATES.get(mode, TEMPLATES["chat_guidance"])
    
    # 4. Build Context-Aware System Message
    context_info = []
    if user_context != "general":
        context_info.append(f"User Type: {user_context}")
    if language != "auto":
        context_info.append(f"Preferred Language: {language}")
    if doc_type != "auto":
        context_info.append(f"Document Type: {doc_type}")
    
    context_str = " | ".join(context_info) if context_info else "General user"
    
    system_message = (
        f"ASSISTANT ROLE: {expert_persona}\n"
        f"CONTEXT: {context_str}\n"
        f"STYLE: {doc_style} tone\n"
        f"TASK: Provide a helpful, intelligent response to: '{message}'\n\n"
        f"RESPONSE GUIDELINES:\n"
        f"- Be conversational and natural, not rigid\n"
        f"- Adapt your response format to the detected mode\n"
        f"- Include relevant examples if helpful\n"
        f"- Be concise but thorough\n\n"
        f"FINAL RULE: End your response with exactly three suggested next steps, formatted as:\n"
        f"**Next Steps:**\n"
        f"1. [Actionable step 1]\n"
        f"2. [Actionable step 2]\n"
        f"3. [Actionable step 3]"
    )

    try:
        client = get_groq_client()
        if not client:
            return {
                "error": "Configuration Error",
                "detected_mode": "chat_guidance",
                "content": "I'm sorry, but the AI service is not properly configured. Please check your GROQ_API_KEY.",
                "next_actions": ["Check environment variables", "Verify deployment dashboard"],
                "meta": {"error": "GROQ_API_KEY_MISSING"}
            }
        
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": message},
            ],
            temperature=0.4
        )
        full_text = completion.choices[0].message.content.strip()
        
        # 5. Parse Content and Next Steps
        content = full_text
        next_actions = []
        
        if "**Next Steps:**" in full_text:
            parts = full_text.split("**Next Steps:**")
            content = parts[0].strip()
            # Extract numbered steps
            steps_section = parts[1].strip()
            lines = steps_section.split('\n')
            for line in lines:
                if line.strip() and (line.strip().startswith('1.') or line.strip().startswith('2.') or line.strip().startswith('3.')):
                    # Remove number and clean
                    step = line.strip()[3:].strip()
                    if step:
                        next_actions.append(step)

        return {
            "detected_mode": mode,
            "content": content,
            "next_actions": next_actions[:3],  # Ensure max 3 steps
            "meta": {
                **intent_data,
                "user_context": user_context,
                "confidence": intent_data.get("intent_confidence", 0.5)
            }
        }
    except Exception as e:
        print(f"Error in generate_assistant_response: {str(e)}")
        return {
            "detected_mode": "chat_guidance",
            "content": f"I'm sorry, but I encountered an error while processing your request: {str(e)}",
            "next_actions": ["Check backend logs", "Verify Groq API Key", "Try again"],
            "meta": {
                "user_context": user_context,
                "confidence": 0.0,
                "error": str(e)
            }
        }

def generate_document_v2(prompt: str, user_type: str = "general", sub_option: str = "auto", doc_style: str = "professional") -> dict:
    """Legacy wrapper for backward compatibility, now using the enhanced assistant logic."""
    # To avoid scope errors and duplicate code, we proxy to the new orchestrator
    result = generate_assistant_response(
        message=prompt,
        user_context=user_type,
        doc_style=doc_style
    )
    # Map back to old key names if necessary
    return {
        "mode": result["detected_mode"],
        "content": result["content"],
        "next_steps": result["next_actions"],
        "meta": result["meta"]
    }
