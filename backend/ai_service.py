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
    - chat_guidance: Nuanced conceptual advice, conversational tutoring, or strategic guidance.
    - code_documentation: Technical synthesis and architectural mapping of existing code.
    - document_generation: Engineering high-fidelity professional, academic, or strategic documents.
    - code_generation: Designing production-grade, optimized, and scalable software components.
    - website_generation: Architecting premium, high-fidelity UI/UX components with modern aesthetics.
    - rewrite_improve: High-stakes editorial refinement, linguistic optimization, and structural refactoring."""
)

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
        "- Providing conceptual analogies to make abstract code tangible. "
        "- Encouraging exploration and curiosity."
    )
}

TEMPLATES = {
    "chat_guidance": "Provide nuanced conceptual advice and strategic guidance. Leverage first-principles reasoning.",
    "code_documentation": "Provide hyper-structured, technically exhaustive mappings of code architecture and logic flows.",
    "document_generation": "Engineer high-fidelity, professional-grade documentation with structural precision.",
    "code_generation": "Design production-ready, scalable, and optimized software components with architectural commentary.",
    "website_generation": "Architect premium UI/UX components focusing on modern aesthetics and clean patterns.",
    "rewrite_improve": "Perform high-stakes editorial refinement, optimizing for linguistic executive impact."
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

def generate_assistant_streaming(message: str, user_context: str = "general", doc_style: str = "professional", language: str = "auto", doc_type: str = "auto"):
    """Real-time streaming using the most stable model for maximum speed and reliability."""
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
    
    system_message = (
        f"CORE PERSONA: {persona_base}\n"
        f"OPERATIONAL MODE: {expert_persona}\n"
        f"CONTEXTUAL MAPPING: {context_str}\n"
        f"ESTABLISHED STYLE: {doc_style} tone\n\n"
        f"REASONING PROTOCOL:\n"
        f"- Use First-Principles Thinking to deconstruct: '{message}'\n"
        f"- Maintain high-fidelity output. Do not truncate technical components.\n"
        f"- Ensure documentation structure aligns with the target Document Type Target above.\n\n"
        f"POST-RESPONSE: Finalize with exactly three strategic next steps under '**Next Steps:**'."
    )

    client = get_groq_client()
    if not client:
        yield "Error: Groq client not initialized."
        return

    try:
        # Use STABLE_MODEL directly for reliable speed
        completion = client.chat.completions.create(
            model=STABLE_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"USER INPUT: {message}"},
            ],
            temperature=1,
            max_tokens=8192,
            top_p=1,
            stream=True,
            stop=None
        )
        
        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content
                
    except Exception as e:
        yield f"Stream Error: {str(e)}"

def generate_assistant_response(message: str, user_context: str = "general", doc_style: str = "professional", language: str = "auto", doc_type: str = "auto") -> dict:
    """Standard response handler using the stable model for high performance."""
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
    
    system_message = (
        f"CORE PERSONA: {persona_base}\n"
        f"OPERATIONAL MODE: {expert_persona}\n"
        f"CONTEXTUAL MAPPING: {context_str}\n"
        f"ESTABLISHED STYLE: {doc_style} tone\n\n"
        f"REASONING PROTOCOL:\n"
        f"- Analyze and fulfill: '{message}'\n"
        f"- Provide high-fidelity, exhaustive output.\n"
        f"- For Developers: High attention to README structure if specified.\n"
        f"- For Learners: Focus on educational code discovery.\n\n"
        f"POST-RESPONSE PROTOCOL: End with exactly three expert-level suggested next steps under '**Next Steps:**'."
    )

    client = get_groq_client()
    if not client:
        return {"error": "Groq client not initialized."}

    try:
        completion = client.chat.completions.create(
            model=STABLE_MODEL,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"USER INPUT: {message}"},
            ],
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
