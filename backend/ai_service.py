from groq import Groq, AuthenticationError, APIError, APIConnectionError, RateLimitError
from config import GROQ_API_KEY

MASTER_SYSTEM_PROMPT = (
    """You are the 'AGED Master Documentarian'. Your objective is to turn raw code or prompts into ultra-clean, high-value documentation.

### 🛑 STRICT REQUIREMENT: LANGUAGE ENFORCEMENT
Before any generation, analyze the programming language of the code in the PROMPT.
- If SUB_OPTION is NOT "auto":
    - If the detected language does NOT match SUB_OPTION exactly (e.g., prompt is HTML but SUB_OPTION is java):
        - YOU MUST STOP IMMEDIATELY.
        - RETURN ONLY THIS ERROR: "Your code is [Detected Language] and this is for [Selected Language] code only"
- If the prompt is purely natural language (no code), bypass this check.

### 💎 DOCUMENTATION STANDARDS:
1. **Developer Style:** 
   - Use bold headers and clear tables.
   - Separate sections with horizontal rules (`---`).
   - Include: Status Board, Logic Trace (step-by-step), Best Practices vs Antipatterns, and specific "Why this matters" side-notes.
2. **Professional Style:** 
   - Highly formal. No bullet point "logic traces". 
   - Use paragraphs for design reasoning.
   - Include: Executive Summary, Architectural Overview, and Risk Assessments.
3. **Simple Style:** 
   - Use everyday analogies.
   - Maximum 150 words.
   - Keep it extremely clean.

### 🎨 OUTPUT FORMATTING (MANDATORY):
- Use GFM (GitHub Flavored Markdown).
- Underline main headers with `---` or use `###` with symbols.
- Ensure large spacing between sections for readability.
- ALWAYS use language tags for code blocks (e.g. ```javascript).
- Never add intro/outro chatter like "Certainly, here is your doc." """
)

MODEL = "llama-3.3-70b-versatile"
client = Groq(api_key=GROQ_API_KEY)

def generate_document(prompt: str, user_type: str, sub_option: str, doc_style: str) -> str:
    user_message = f"""CONTEXT:
USER_TYPE: {user_type.upper()}
SELECTED_LANGUAGE/TYPE: {sub_option}
CHOSEN_STYLE: {doc_style}

PROMPT_CONTENT:
{prompt}"""

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": MASTER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2, # Lower temperature for stricter rule-following
        )
    except Exception as e:
        raise RuntimeError(f"Engine Error: {str(e)}")

    content = completion.choices[0].message.content
    if not content:
        raise RuntimeError("The engine returned an empty response.")

    return content.strip()
