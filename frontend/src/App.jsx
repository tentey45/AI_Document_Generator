import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, GraduationCap, FileText, Copy, Download, Check, AlertCircle, Trash2, Sun, Moon, Send, Settings, BookOpen, Layers } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './index.css';

// Import the local asset
import heroAsset from './assets/hero_ai.png';

function App() {
  const [persona, setPersona] = useState(localStorage.getItem('user_persona') || null); // 'developer' or 'learner'
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [detectedMode, setDetectedMode] = useState('');
  const [nextActions, setNextActions] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (persona) {
      localStorage.setItem('user_persona', persona);
    }
  }, [persona]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setIsThinking(true);
    setError(null);
    setAssistantResponse(null);

    try {
      const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const API_URL = rawUrl.replace(/\/$/, '');
      
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          user_context: persona,
          preferences: {
            theme: 'futuristic',
            high_fidelity: true
          }
        }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        throw new Error("Backend returned invalid response. Check your API key.");
      }

      if (!response.ok) {
        throw new Error(data.detail?.message || data.detail || 'Connection failed');
      }

      setAssistantResponse(data.content);
      setDetectedMode(data.detected_mode);
      setNextActions(data.next_actions || []);
      
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsThinking(false);
    }
  };

  const handleCopy = () => {
    if (!assistantResponse) return;
    navigator.clipboard.writeText(assistantResponse).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 1. LANDING / PERSONA SELECTION
  if (!persona) {
    return (
      <div className="persona-overlay">
        <div className="glass-container persona-card">
          <img src={heroAsset} alt="AI Core" className="hero-image" />
          <h1 style={{fontSize: '3rem', fontWeight: 800, marginBottom: '16px'}}>
            A<span style={{color: 'var(--accent-cyan)'}}>GEN</span> V3
          </h1>
          <p style={{color: 'var(--text-dim)', fontSize: '1.2rem'}}>How will you use the AI assistant today?</p>
          
          <div className="persona-grid">
            <div className="glass-container persona-option" onClick={() => setPersona('developer')}>
              <Code className="persona-icon" />
              <h3>Developer</h3>
              <p style={{fontSize: '0.9rem', opacity: 0.7}}>Focus on optimized code, architecture, and documentation.</p>
            </div>
            <div className="glass-container persona-option learner" onClick={() => setPersona('learner')}>
              <GraduationCap className="persona-icon" />
              <h3>Learrer</h3>
              <p style={{fontSize: '0.9rem', opacity: 0.7}}>Clear explanations, conceptual guides, and learning paths.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN WORKSPACE
  return (
    <div className="app-layout">
      {/* Sidebar Settings */}
      <aside className="glass-container sidebar">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px'}}>
          <Sparkles color="var(--accent-cyan)" />
          <h2 style={{fontSize: '1.5rem'}}>AI Portal</h2>
        </div>
        
        <div style={{flex: 1}}>
          <div className="persona-indicator" style={{
            padding: '16px', 
            borderRadius: '12px', 
            background: persona === 'developer' ? 'rgba(0, 242, 255, 0.1)' : 'rgba(188, 19, 254, 0.1)',
            borderLeft: `4px solid ${persona === 'developer' ? 'var(--accent-cyan)' : 'var(--accent-purple)'}`,
            marginBottom: '20px'
          }}>
            <p style={{fontSize: '0.8rem', opacity: 0.6, textTransform: 'uppercase'}}>Currently</p>
            <h4 style={{textTransform: 'capitalize'}}>{persona} Mode</h4>
          </div>

          <button className="glass-container" onClick={() => setPersona(null)} style={{
            width: '100%', padding: '12px', background: 'transparent', color: 'white', cursor: 'pointer'
          }}>
            Switch Persona
          </button>
        </div>

        <div style={{opacity: 0.3, fontSize: '0.8rem', textAlign: 'center'}}>
          © 2026 AI Document Generator
        </div>
      </aside>

      {/* Main interaction */}
      <main className="main-content">
        <div className="glass-container panel">
          <div className="response-area">
            {!assistantResponse && !isThinking && (
              <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2}}>
                <Layers size={80} />
                <p style={{marginTop: '20px', fontSize: '1.2rem'}}>Initialize sequence...</p>
              </div>
            )}

            {assistantResponse && (
              <div className="ai-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <div className="code-block">
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code style={{background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px'}} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {assistantResponse}
                </ReactMarkdown>

                {nextActions.length > 0 && (
                  <div style={{marginTop: '40px', borderTop: '1px solid var(--glass-border)', paddingTop: '20px'}}>
                    <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--accent-cyan)'}}>
                      <BookOpen size={18} /> Suggested Next Steps
                    </h4>
                    <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                      {nextActions.map((action, i) => (
                        <button key={i} className="glass-container" onClick={() => setMessage(action)} style={{
                          padding: '8px 16px', background: 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', fontSize: '0.9rem'
                        }}>
                          {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isThinking && (
              <div style={{display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--accent-cyan)'}}>
                <Sparkles className="spinning" />
                <span>Generating high-fidelity response...</span>
              </div>
            )}

            {error && (
              <div className="glass-container" style={{padding: '20px', borderLeft: '4px solid #ff4b4b', background: 'rgba(255,75,75,0.05)'}}>
                <p style={{color: '#ff4b4b'}}><strong>Error:</strong> {error}</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-bar">
            <div className="chat-input-wrapper">
              <textarea
                placeholder={`Ask as a ${persona}...`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <button 
                onClick={handleSendMessage}
                disabled={isThinking || !message.trim()}
                style={{
                  background: 'var(--accent-cyan)', 
                  border: 'none', 
                  borderRadius: '12px', 
                  padding: '12px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--glow-cyan)'
                }}
              >
                <Send size={20} color="black" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
