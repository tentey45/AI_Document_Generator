from groq import Groq, AuthenticationError, APIError, APIConnectionError, RateLimitError

from config import GROQ_API_KEY


SYSTEM_PROMPT = (
    """You are a Senior Technical Writer and Academic Assistant. Your job is to generate highly structured, professional documents based on the user's input.

You will receive three pieces of context:
1. USER_TYPE: Either "Developer" or "Student"
2. SUB_OPTION: A specific programming language, document type, OR "auto"
3. PROMPT: The user's actual text or code

### RULES:
- ALWAYS follow the exact structure required for the user type and document type.
- Do NOT output conversational filler like "Here is your document." Output ONLY the final document in Markdown.
- IF SUB_OPTION is "auto": You must analyze the PROMPT and deduce the best fitting language or document type, then apply the corresponding structure.

### DEVELOPER STRUCTURE:
If USER_TYPE is "Developer", you must document the provided code or technical prompt using this exact structure:
# [Function/Module Name]
**Language:** [Detected/Selected Language]
## Purpose
[1-2 sentences explaining what it does]
## Parameters
- `[param_name]` ([type]): [description]
## Return Value
- `[return_name]` ([type]): [description]
## Logic Explanation
[Step-by-step bullet points explaining how the code works]
## Example Usage
```[language]
[Code example]
```

### STUDENT STRUCTURES:
If USER_TYPE is "Student", use the structure that matches the SUB_OPTION (or auto-detect between Academic, Proposal, Defense, or Professional based on prompt keywords).

[Academic Document Structure]
# [Title]
## Introduction
## Background
## Methodology
## Analysis
## Conclusion

[Proposal Document Structure]
# [Project Title] Proposal
## Problem Statement
## Objectives
## Proposed Solution
## Expected Outcome

[Defense Document Structure]
# [Project Title] Defense
## Project Overview
## Problem Statement
## Methodology
## Results
## Conclusion

[Professional Document Structure]
# [Title]
[Clear, concise, business-style paragraphs]"""
)

MODEL = "llama-3.3-70b-versatile"

client = Groq(api_key=GROQ_API_KEY)


def generate_document(prompt: str, user_type: str, sub_option: str) -> str:
    user_message = f"USER_TYPE: {user_type}\nSUB_OPTION: {sub_option}\n\nPROMPT:\n{prompt}"

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
        )
    except AuthenticationError:
        raise ValueError(
            "Invalid or missing Groq API key. Please set a valid GROQ_API_KEY in your .env file."
        )
    except RateLimitError:
        raise ValueError(
            "Groq rate limit exceeded. Please wait a moment and try again."
        )
    except APIConnectionError:
        raise ConnectionError(
            "Could not connect to Groq API. Check your internet connection."
        )
    except APIError as e:
        raise RuntimeError(f"Groq API error: {e.message}")

    content = completion.choices[0].message.content

    # Bug fix: Groq can return None or empty string — guard against it
    if not content or not content.strip():
        raise RuntimeError(
            "Groq returned an empty response. Try rephrasing your prompt."
        )

    return content.strip()
