# AI Assistant - Claude-like Document Generator

A modern AI assistant that understands user intent and generates adaptive responses for code documentation, academic papers, websites, and more.

## Features

- **Intent Detection**: Automatically understands user requests
- **6 Response Modes**: Chat guidance, code documentation, document generation, code generation, website generation, rewrite/improve
- **Claude-like UI**: Clean, modern interface with sidebar settings
- **Smart Suggestions**: Provides next-step actions after each response
- **User Types**: Optimized for Developers and Students

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel will automatically detect the project structure
3. Set environment variables in Vercel dashboard:
   - `GROQ_API_KEY`: Your Groq API key
4. Deploy!

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Environment Variables

- `GROQ_API_KEY`: Required for Groq API access

## Project Structure

```
├── backend/
│   ├── main.py          # FastAPI server
│   ├── ai_service.py    # AI logic and intent detection
│   └── config.py        # Configuration
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # React application
│   │   └── index.css    # Styles
│   └── package.json
├── vercel.json          # Vercel configuration
└── requirements.txt     # Python dependencies
```

## API Endpoints

- `POST /chat` - Main chat endpoint with intent detection
- `GET /health` - Health check endpoint

## Usage

1. Select your user type (Developer/Student)
2. Set preferences (language, document style, etc.)
3. Type your natural language request
4. AI detects intent and provides appropriate response
5. Click suggested next steps to continue conversation
