# AI Prompt Library

This document serves as a comprehensive library of the prompts powering the AI Document Generator's core features. It outlines the purpose, structure, and prompt engineering techniques employed for each prompt.

---

## 1. Intent Detection (Router)

### [ROUTER_PROMPT](file:///c:/Users/U-ser/desktop/AI_Document_Generator/backend/ai_service.py#L26)
**Purpose**: Analyzes user input to determine the optimal response mode (conversation, explanation, or document).

**Prompt Engineering Technique**:
- **Role Selection**: Defines the AI as an "Advanced Semantic Orchestrator."
- **JSON Mode**: Forces the output into a specific JSON schema for reliable backend parsing.
- **Classification Taxonomy**: Provides clear categories and examples for each mode.
- **Negative Constraints**: "CRITICAL RULE: If the user is just asking a question... you MUST choose 'conversation'."

---

## 2. Adaptive Personas

### [PERSONAS](file:///c:/Users/U-ser/desktop/AI_Document_Generator/backend/ai_service.py#L47)
**Purpose**: Defines the tone and behavior for the `developer` and `learner` modes.

**Prompt Engineering Technique**:
- **Expert Personas**: Provides high-level background and constraints (e.g., "Elite Builder Assistant" vs "Senior Technical Architect").
- **Action-Oriented Constraints**: "Do NOT write articles or blogs. You build solutions."
- **Structural Enforcement**: "Explain through structure and examples, not theory."

---

## 3. Dynamic Mode Protocols

Based on the [Router's intent detection](file:///c:/Users/U-ser/desktop/AI_Document_Generator/backend/ai_service.py#L106-L130), the application dynamically generates system messages for each mode.

### Document Mode
**Purpose**: Focused on producing formal, high-fidelity technical documents.
- **Tag-Triggered Intent Analysis**: Requires a concise sentence in `<intent>` tags to provide a thinking process.
- **Strict Formatting**: Mandates headings, bullet points, and a structured outcome.
- **Call-to-Action (CTA)**: Always ends with a `**Next Steps:**` block.

### Explanation Mode
**Purpose**: Designed for mentoring and knowledge deconstruction.
- **Simplified Structure**: Specifically bans `<intent>` tags and heavy formatting to prioritize direct communication.
- **Instructional Focus**: Emphasizes bullet points and concise language.

### Conversation Mode
**Purpose**: Handled as a quick, natural interaction.
- **Minimalist Approach**: Specifically instructs the AI to drop all formatting and structural overhead.
- **Latency Efficiency**: Aims for the fastest, most direct response possible.

---

## 4. Feature-Specific Templates

### [TEMPLATES](file:///c:/Users/U-ser/desktop/AI_Document_Generator/backend/ai_service.py#L59)
**Purpose**: Fine-tunes behavior for specific tasks such as code generation, UI/UX architecture, or document refactoring.

**Prompt Engineering Technique**:
- **Context Priming**: Pre-conditions the AI with task-specific goals (e.g., "Engineer a hyper-structured technical blueprint").
- **Constraint Stacking**: Combines persona instructions with specific template guidance for multi-dimensional behavior.
