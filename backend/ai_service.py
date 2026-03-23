from groq import Groq
import json
import os

# 120-billion parameter premium model (Optional)
PREMIUM_MODEL = "openai/gpt-oss-120b"
# Highly stable and fast model (Primary)
STABLE_MODEL = "llama-3.3-70b-versatile"

def get_groq_client():
    """Lazy-initializes the Groq client only when needed during a request."""
    try:
        from backend.config import GROQ_API_KEY
    except ImportError:
        from config import GROQ_API_KEY
    
    if not GROQ_API_KEY:
        return None
    
    try:
        return Groq(api_key=GROQ_API_KEY)
    except Exception as e:
        print(f"Failed to initialize Groq client: {str(e)}")
        return None

ROUTER_PROMPT = (
    """You are the Advanced Semantic Orchestrator for a high-intelligence AI ecosystem. 
    Analyze the user's input with deep-level reasoning to determine the optimal response mode.
    
    Respond ONLY with a valid JSON object: 
    { 
      "mode": "...", 
      "detected_language": "...", 
      "is_technical": boolean, 
      "intent_confidence": float,
      "reasoning_path": "short description of why this mode was chosen"
    }

    MODES & ARCHETYPES:
    - conversation: For greetings, simple questions, or quick help. (e.g., "Hello", "What is React?").
    - explanation: For "Explain this", "Help me understand", or beginner questions.
    - document: For explicit generation requests (e.g., "Generate README", "Write documentation", "Create proposal").

    CRITICAL RULE: If the user is just asking a question or greeting you, you MUST choose 'conversation'. ONLY choose 'document' if 
    they are clearly asking to build/create a formal document structure."""
)

PERSONAS = {
    "developer": (
        "You are an Elite Builder Assistant and Architect. You do NOT write articles or blogs. "
        "You build solutions. Your output must be highly structured, practical, and immediately usable. "
        "When a user asks for a design or layout, don't explain why it's good—show the structure and provide the implementation."
    ),
    "learner": (
        "You are a Senior Technical Architect and Mentor. Your goal is to deconstruct complex systems into buildable steps. "
        "Explain through structure and examples, not theory. Always provide a concrete starting point or code snippet."
    )
}

TEMPLATES = {
    "chat_guidance": "Provide a structured solution. Use bullet points, steps, and examples. No fluff. No theory.",
    "code_documentation": "Engineer a hyper-structured technical blueprint. Maps, flows, and specs only.",
    "document_generation": "Architect a production-grade document template. Focus on structure, clarity, and actionable sections.",
    "code_generation": "Design optimized, modular code components. Include clear implementation steps and examples.",
    "website_generation": "Architect high-fidelity UI/UX layouts. Provide the visual structure (ASCII or descriptions) and the code blocks.",
    "rewrite_improve": "Refactor and optimize the input for maximum structural impact and clarity.",
    "imagination_leap": "Deconstruct visionary concepts into structural components. Brainstorm through building blocks."
}

def detect_intent(prompt: str) -> dict:
    """Internal LLM call to categorize the user's request with a router prompt."""
    client = get_groq_client()
    if not client:
        return {"mode": "chat_guidance", "detected_language": "auto", "is_technical": False, "intent_confidence": 0.5}

    try:
        completion = client.chat.completions.create(
            model=STABLE_MODEL,
            messages=[
                {"role": "system", "content": ROUTER_PROMPT},
                {"role": "user", "content": f"ANALYZE: {prompt}"},
            ],
            temperature=0,
            top_p=1,
            response_format={"type": "json_object"}
        )
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        print(f"Error in detect_intent: {str(e)}")
        return {"mode": "chat_guidance", "detected_language": "auto", "is_technical": False, "intent_confidence": 0.5}

def generate_assistant_streaming(message: str, history: list = [], user_context: str = "general", doc_style: str = "professional", language: str = "auto", doc_type: str = "auto"):
    """Real-time streaming with persistent conversation memory."""
    intent_data = detect_intent(message)
    mode = intent_data.get("mode", "chat_guidance")
    expert_persona = TEMPLATES.get(mode, TEMPLATES["chat_guidance"])
    
    # 2. Setup prompts
    persona_base = PERSONAS.get(user_context, PERSONAS["developer"])
    context_info = []
    if user_context != "general": context_info.append(f"Entity Context: {user_context.upper()}")
    if language != "auto": context_info.append(f"Language: {language}")
    if doc_type != "auto": context_info.append(f"Document Type Target: {doc_type}")
    
    context_str = " | ".join(context_info) if context_info else "General context"
    
    # 2. Select system protocol based on detected mode
    if mode == "document":
        system_message = (
            f"CORE IDENTITY: Elite Builder Assistant (Document Mode)\n"
            f"1. START with exactly one concise sentence wrapped in <intent> tags.\n"
            f"2. Use HEAVY STRUCTURE: Headings, sections, and professional templates.\n"
            f"3. PROVIDE actionable building blocks: Steps, layout, and implementation.\n"
            f"4. END with '**Next Steps:**' and exactly three items."
        )
    elif mode == "explanation":
        system_message = (
            f"CORE IDENTITY: Senior Technical Mentor (Explanation Mode)\n"
            f"1. NO <intent> tags. NO heavy document structure.\n"
            f"2. BE CONCISE: Use clear bullet points and simple language.\n"
            f"3. STYLE: Helpful, direct, and slightly structured for clarity.\n"
            f"4. END with exactly three follow-up questions/steps under '**Next Steps:**'."
        )
    else: # Default: Conversation Mode
        system_message = (
            f"CORE IDENTITY: Smart Assistant (Conversation Mode)\n"
            f"1. NO <intent> tags. NO headings. NO structure. NO templates.\n"
            f"2. BE FAST & DIRECT: Provide a short, natural, and helpful answer.\n"
            f"3. TONE: Human-like, concise, and helpful. Avoid over-explaining.\n"
            f"4. SKIP '**Next Steps:**' entirely unless specifically helpful."
        )

    # 3. Construct message array for Groq
    messages = [{"role": "system", "content": system_message}]
    
    # Add historical context (filtered for role and content only)
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    
    # Add current user prompt
    messages.append({"role": "user", "content": f"USER INPUT: {message}"})

    client = get_groq_client()
    if not client:
        yield "Error: Groq client not initialized."
        return

    try:
        completion = client.chat.completions.create(
            model=STABLE_MODEL,
            messages=messages,
            temperature=1,
            max_tokens=8192,
            top_p=1,
            stream=True
        )
        
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content
                
    except Exception as e:
        yield f"Stream Error: {str(e)}"

def generate_assistant_response(message: str, history: list = [], user_context: str = "general", doc_style: str = "professional", language: str = "auto", doc_type: str = "auto") -> dict:
    """Standard response handler with full conversation memory."""
    intent_data = detect_intent(message)
    mode = intent_data.get("mode", "chat_guidance")
    expert_persona = TEMPLATES.get(mode, TEMPLATES["chat_guidance"])
    
    # 2. Setup prompts
    persona_base = PERSONAS.get(user_context, PERSONAS["developer"])
    context_info = []
    if user_context != "general": context_info.append(f"Entity: {user_context.upper()}")
    if language != "auto": context_info.append(f"Language: {language}")
    if doc_type != "auto": context_info.append(f"Document Type Target: {doc_type}")
    
    context_str = " | ".join(context_info) if context_info else "General user"
    
    # 2. Select protocol based on mode
    if mode == "document":
        system_message = (
            f"CORE IDENTITY: Elite Builder Assistant (Document Mode)\n"
            f"1. START with <intent> tag.\n"
            f"2. USE HEAVY STRUCTURE and templates.\n"
            f"3. END with '**Next Steps:**'."
        )
    elif mode == "explanation":
        system_message = (
            f"CORE IDENTITY: Senior Technical Mentor (Explanation Mode)\n"
            f"1. NO <intent> tags. Use clear bullet points.\n"
            f"2. BE CONCISE and focused on the explanation.\n"
            f"3. END with '**Next Steps:**'."
        )
    else: # Default: Conversation
        system_message = (
            f"CORE IDENTITY: Smart Assistant (Conversation Mode)\n"
            f"1. NO <intent> tags. NO headings. NO templates.\n"
            f"2. BE SHORT, NATURAL, and DIRECT.\n"
            f"3. NO '**Next Steps:**' headers."
        )

    # 3. Construct message array
    messages = [{"role": "system", "content": system_message}]
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})
    messages.append({"role": "user", "content": f"USER INPUT: {message}"})

    client = get_groq_client()
    if not client:
        return {"error": "Groq client not initialized."}

    try:
        completion = client.chat.completions.create(
            model=STABLE_MODEL,
            messages=messages,
            temperature=1,
            max_tokens=8192,
            top_p=1
        )
        full_text = completion.choices[0].message.content.strip()
        
        content = full_text
        next_actions = []
        
        if "**Next Steps:**" in full_text:
            parts = full_text.split("**Next Steps:**")
            content = parts[0].strip()
            steps_section = parts[1].strip()
            lines = steps_section.split('\n')
            for line in lines:
                if line.strip() and (line.strip().startswith('1.') or line.strip().startswith('2.') or line.strip().startswith('3.')):
                    step = line.strip()[3:].strip()
                    if step: next_actions.append(step)

        return {
            "detected_mode": mode,
            "content": content,
            "next_actions": next_actions[:3],
            "meta": {**intent_data, "user_context": user_context}
        }
    except Exception as e:
        print(f"Error in generate_assistant_response: {str(e)}")
        return {"error": str(e)}

def generate_document_v2(prompt: str, user_type: str = "general", sub_option: str = "auto", doc_style: str = "professional") -> dict:
    """Legacy wrapper for backward compatibility."""
    result = generate_assistant_response(
        message=prompt,
        user_context=user_type,
        doc_style=doc_style
    )
    return {
        "mode": result.get("detected_mode", "chat_guidance"),
        "content": result.get("content", ""),
        "next_steps": result.get("next_actions", []),
        "meta": result.get("meta", {})
    }
