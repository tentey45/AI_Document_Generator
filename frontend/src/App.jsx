import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, GraduationCap, FileText, Copy, Download, Check, AlertCircle, Trash2, Sun, Moon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import './index.css';

function App() {
  const [userType, setUserType] = useState('developer'); // 'developer' or 'student'
  const [documentStyle, setDocumentStyle] = useState('professional');
  const [language, setLanguage] = useState('auto');
  const [documentType, setDocumentType] = useState('auto');
  const [message, setMessage] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState(null);
  const [detectedMode, setDetectedMode] = useState('');
  const [nextActions, setNextActions] = useState([]);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleUserTypeChange = (newType) => {
    setUserType(newType);
    setLanguage('auto');
    setDocumentType('auto');
    setWarning(null);
    setError(null);
  };

  const handleMessageChange = (e) => {
    const val = e.target.value;
    setMessage(val);

    // Smart validation
    if (userType === 'student' && (val.includes('function ') || val.includes('class ') || val.includes('const ') || val.includes('def '))) {
      setWarning('Your input looks like code. Switch to Developer mode for better assistance!');
    } else if (userType === 'developer' && val.includes('<html') && val.includes('</html>')) {
      setWarning('This looks like HTML. Consider using website generation mode.');
    } else {
      setWarning(null);
    }
  };

  const clearConversation = () => {
    setMessage('');
    setAssistantResponse(null);
    setDetectedMode('');
    setNextActions([]);
    setError(null);
    setWarning(null);
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      setError('Please enter a message.');
      return;
    }

    setIsThinking(true);
    setError(null);
    setAssistantResponse(null);
    setDetectedMode('');
    setNextActions([]);

    try {
      const preferences = {
        doc_style: documentStyle,
        language: language,
        doc_type: documentType
      };

      // Use Vercel/Render env variable, fallback to '/api' for local Vite proxy
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'; 
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message,
          user_context: userType,
          preferences: preferences
        }),
      });

      // SAFE RESPONSE HANDLING
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        // If not JSON, it's likely a text error from the server/load balancer
        throw new Error(responseText || `Server returned ${response.status} ${response.statusText}`);
      }

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to connect to AI assistant.');
      }

      setAssistantResponse(data.content);
      setDetectedMode(data.detected_mode);
      setNextActions(data.next_actions || []);
      setWarning(null);
      
      // Auto-scroll to response
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('AI Error:', err);
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

  const handleDownload = () => {
    if (!assistantResponse) return;
    const blob = new Blob([assistantResponse], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_Response_${userType}_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Sparkles size={28} style={{ color: 'var(--accent-primary)' }} />
          <h1>A<span>GEN</span></h1>
        </div>
        <div className="nav-actions">
          <button className="theme-btn" onClick={toggleTheme} title="Toggle Theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="theme-btn" onClick={clearConversation} title="Clear Conversation">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <main className="assistant-layout">
        {/* Left Sidebar */}
        <aside className="settings-sidebar">
          <div className="sidebar-section">
            <h3>User Type</h3>
            <div className="user-type-switch">
              <button 
                className={`user-type-btn ${userType === 'developer' ? 'active' : ''}`}
                onClick={() => handleUserTypeChange('developer')}
              >
                <Code size={18} /> Developer
              </button>
              <button 
                className={`user-type-btn ${userType === 'student' ? 'active' : ''}`}
                onClick={() => handleUserTypeChange('student')}
              >
                <GraduationCap size={18} /> Student
              </button>
            </div>
          </div>

          <div className="sidebar-section">
            <h3>Preferences</h3>
            {userType === 'developer' ? (
              <>
                <div className="form-group">
                  <label>Document Style</label>
                  <select value={documentStyle} onChange={(e) => setDocumentStyle(e.target.value)}>
                    <option value="developer">Developer Style</option>
                    <option value="professional">Professional Style</option>
                    <option value="simple">Simple Style</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Programming Language</label>
                  <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <option value="auto">Auto Detect</option>
                    <option value="python">Python</option>
                    <option value="javascript">JavaScript</option>
                    <option value="java">Java</option>
                    <option value="cpp">C++</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label>Document Type</label>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="auto">Auto Detect</option>
                  <option value="academic">Academic</option>
                  <option value="proposal">Proposal</option>
                  <option value="defense">Defense</option>
                  <option value="professional">Professional</option>
                  <option value="simple">Simple</option>
                </select>
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="main-workspace">
          {/* Response Area */}
          <div className="response-container">
            {detectedMode && (
              <div className="detected-mode">
                <span className="mode-label">Mode:</span>
                <span className="mode-value">{detectedMode}</span>
              </div>
            )}
            
            <div className="response-content">
              {error ? (
                <div className="error-message">
                  <AlertCircle size={24} />
                  <div>
                    <strong>Error:</strong> {error}
                  </div>
                </div>
              ) : isThinking ? (
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <p>AI is thinking...</p>
                </div>
              ) : assistantResponse ? (
                <>
                  <div className="response-text">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({ node, inline, className, children, ...props }) {
                          const match = /language-(\w+)/.exec(className || '');
                          return !inline && match ? (
                            <SyntaxHighlighter
                              style={theme === 'dark' ? vscDarkPlus : prism}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {assistantResponse}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Next Actions */}
                  {nextActions.length > 0 && (
                    <div className="next-actions">
                      <h4>Suggested Next Steps</h4>
                      <div className="action-buttons">
                        {nextActions.map((action, index) => (
                          <button key={index} className="action-btn" onClick={() => setMessage(action)}>
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <FileText size={64} style={{ opacity: 0.2 }} />
                  <p>Ask me anything! </p>
                </div>
              )}
            </div>
            
            {/* Response Actions */}
            {assistantResponse && (
              <div className="response-actions">
                <button className="action-btn secondary" onClick={handleCopy}>
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button className="action-btn secondary" onClick={handleDownload}>
                  <Download size={18} /> Download
                </button>
              </div>
            )}
          </div>
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="input-area">
          {warning && (
            <div className="warning-message">
              <AlertCircle size={18} />
              <span>{warning}</span>
            </div>
          )}
          
          <div className="input-container">
            <textarea 
              className="message-input"
              placeholder="Ask me anything!"
              value={message}
              onChange={handleMessageChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <button 
              className="send-button" 
              onClick={handleSendMessage}
              disabled={isThinking || !message.trim()}
            >
              <Sparkles size={20} />
              {isThinking ? 'Thinking...' : 'Send'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
