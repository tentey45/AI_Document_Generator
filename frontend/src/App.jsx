import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, GraduationCap, Send, Trash2, Sidebar as SidebarIcon, BookOpen, User, Bot, Loader2, RefreshCw, FileCode, Copy, Download, FileText, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

import './index.css';

// Local assets if any
import heroAsset from './assets/hero_ai.png';

function App() {
  const [persona, setPersona] = useState(localStorage.getItem('user_persona') || null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [nextActions, setNextActions] = useState([]);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('auto');
  const [copyStatus, setCopyStatus] = useState(null); 
  const messagesEndRef = useRef(null);

  const docOptions = {
    developer: [
      { value: 'auto', label: 'Auto-detect' },
      { value: 'README.md', label: 'README.md' },
      { value: 'Technical Spec', label: 'Technical Spec' },
      { value: 'API Reference', label: 'API Reference' },
      { value: 'Project Status', label: 'Project Status' }
    ],
    learner: [
      { value: 'auto', label: 'Auto-detect' },
      { value: 'Code Discovery', label: 'Code Discovery' },
      { value: 'Line-by-Line Analysis', label: 'Line-by-Line Analysis' },
      { value: 'High-Level Overview', label: 'High-Level Overview' },
      { value: 'Step-by-Step Tutorial', label: 'Step-by-Step Tutorial' }
    ]
  };

  useEffect(() => {
    if (persona) {
      localStorage.setItem('user_persona', persona);
      setDocType('auto');
    }
  }, [persona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSendMessage = async (textOverride = null) => {
    const text = textOverride || inputText;
    if (!text.trim() || isStreaming) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsThinking(true);
    setError(null);
    setNextActions([]);

    try {
      const rawUrl = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
      const API_URL = rawUrl.replace(/\/$/, '');
      
      const response = await fetch(`${API_URL}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_context: persona,
          preferences: { 
            theme: 'futuristic', 
            high_fidelity: true,
            doc_type: docType
          }
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail?.message || errData.detail || 'Connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponseText = '';
      let done = false;

      setIsThinking(false);
      setIsStreaming(true);

      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          aiResponseText += chunk;
          
          setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].content = aiResponseText;
            return newMessages;
          });
        }
      }

      setIsStreaming(false);

      if (aiResponseText.includes("**Next Steps:**")) {
        const parts = aiResponseText.split("**Next Steps:**");
        const stepsSection = parts[1].trim();
        const extractedSteps = stepsSection
          .split('\n')
          .filter(line => line.trim().match(/^[1-3]\./))
          .map(line => line.trim().replace(/^[1-3]\.\s*/, ''))
          .filter(Boolean);
        setNextActions(extractedSteps.slice(0, 3));
      }

    } catch (err) {
      setError(err.message);
      setIsThinking(false);
      setIsStreaming(false);
    }
  };

  const handleCopy = (text, idx) => {
    // Organzie Text: Stipping markdown symbols to provide just the clean "Organized" text lines
    const contentLines = text.split('**Next Steps:**')[0].trim().split('\n');
    const cleanLines = contentLines.map(line => {
        let l = line.trim();
        l = l.replace(/^[#]+\s+/, ''); // Remove # headers
        l = l.replace(/^[\*\-\+]\s+/, '• '); // List conversion
        l = l.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove **
        l = l.replace(/`(.*?)`/g, '$1'); // Remove `
        return l;
    });

    navigator.clipboard.writeText(cleanLines.join('\n')).then(() => {
      setCopyStatus(idx);
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const generatePrintableHTML = (content) => {
    // Format: Black text with Professional Blue Highlight for code segments
    const formattedContent = content
      .replace(/^# (.*$)/gim, '<h1 style="color: #000; margin-bottom: 20px;">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 style="color: #000; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-top: 30px;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="color: #111; margin-top: 25px;">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      .replace(/`(.*?)`/g, '<span style="color: #0056b3; font-family: monospace; font-weight: 500;">$1</span>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Project Export</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; padding: 60px; color: #000; line-height: 1.8; max-width: 850px; margin: 0 auto; background: #fff; }
            h1, h2, h3 { font-weight: 800; font-family: 'Inter', sans-serif; }
            @media print {
              body { padding: 0px; }
              @page { margin: 2.5cm; }
            }
          </style>
        </head>
        <body>
          <div style="font-size: 11px; color: #777; margin-bottom: 40px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
            AI DOCUMENT ACCELERATOR | PERSONA: ${persona.toUpperCase()} | ${new Date().toLocaleDateString()}
          </div>
          ${formattedContent.split('**Next Steps:**')[0]}
        </body>
      </html>
    `;
  };

  const handleDownloadPDF = (content) => {
    const printWindow = window.open('', '_blank');
    const html = generatePrintableHTML(content);
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  const handleDownloadDoc = (content, index) => {
    // Generate REAL .docx binary file using 'docx' library
    const lines = content.split('**Next Steps:**')[0].trim().split('\n');
    const paragraphs = lines.map(line => {
        const text = line.trim();
        if (text.startsWith('# ')) {
            return new Paragraph({ text: text.replace('# ', ''), heading: HeadingLevel.HEADING_1 });
        } else if (text.startsWith('## ')) {
            return new Paragraph({ text: text.replace('## ', ''), heading: HeadingLevel.HEADING_2 });
        } else if (text.startsWith('### ')) {
            return new Paragraph({ text: text.replace('### ', ''), heading: HeadingLevel.HEADING_3 });
        }
        
        // Handle bolding and code highlights for standard lines
        const runs = [];
        let remaining = text;
        
        // Very basic parser for **bold** and `code`
        const regex = /(\*\*.*?\*\*|`.*?`)/g;
        let match;
        let lastIdx = 0;
        
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIdx) {
                runs.push(new TextRun(text.slice(lastIdx, match.index)));
            }
            const chunk = match[0];
            if (chunk.startsWith('**')) {
                runs.push(new TextRun({ text: chunk.replace(/\*\*/g, ''), bold: true }));
            } else if (chunk.startsWith('`')) {
                runs.push(new TextRun({ text: chunk.replace(/`/g, ''), color: "0056B3" }));
            }
            lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) {
            runs.push(new TextRun(text.slice(lastIdx)));
        }

        return new Paragraph({ children: runs.length > 0 ? runs : [new TextRun(text)] });
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: paragraphs
      }]
    });

    Packer.toBlob(doc).then(blob => {
      saveAs(blob, `AGED_Export_${index}.docx`);
    });
  };

  const clearChat = () => {
    setMessages([]);
    setNextActions([]);
    setError(null);
  };

  if (!persona) {
    return (
      <div className="landing-overlay">
        <div className="landing-card glass">
          <img src={heroAsset} alt="AI Engine" style={{width: '200px', margin: '0 auto 24px', filter: 'drop-shadow(0 0 20px var(--accent-cyan))'}} />
          <h1 style={{fontSize: '3rem', fontWeight: 800, marginBottom: '8px'}}>A<span style={{color: 'var(--accent-cyan)'}}>GED</span></h1>
          <p style={{color: 'var(--text-dim)', fontSize: '1.2rem'}}>The Premium AI Document & Strategy Accelerator</p>
          
          <div className="persona-options">
            <div className="option-card glass" onClick={() => setPersona('developer')}>
              <Code size={48} color="var(--accent-cyan)" />
              <h3 style={{margin: '16px 0 8px'}}>Developer Mode</h3>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)'}}>Detailed READMEs, API mapping, and exhaustive technical specs.</p>
            </div>
            <div className="option-card glass" onClick={() => setPersona('learner')}>
              <GraduationCap size={48} color="var(--accent-purple)" />
              <h3 style={{margin: '16px 0 8px'}}>Learner Mode</h3>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)'}}>Code discovery, architectural breakdowns, and mentored learning.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <aside className="sidebar glass">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px'}}>
          <Sparkles color="var(--accent-cyan)" fill="var(--accent-cyan)" size={24} />
          <h2 style={{fontSize: '1.2rem', fontWeight: 700}}>AGED CORE</h2>
        </div>

        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '20px'}}>
          <div className="persona-box glass" style={{padding: '16px', borderLeft: `4px solid ${persona === 'developer' ? 'var(--accent-cyan)' : 'var(--accent-purple)'}`}}>
            <p style={{fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px'}}>Active Persona</p>
            <h4 style={{textTransform: 'capitalize'}}>{persona}</h4>
          </div>

          <div className="dropdown-container">
            <p style={{fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px'}}>
              <FileCode size={12} /> Documentation Type
            </p>
            <select 
              value={docType} 
              onChange={(e) => setDocType(e.target.value)}
              className="glass-select"
            >
              {docOptions[persona].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button className="step-btn" onClick={() => setPersona(null)} style={{width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center'}}>
              <RefreshCw size={14} /> Reset Identity
            </button>
            <button className="step-btn" onClick={clearChat} style={{width: '100%', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#ff4b4b'}}>
              <Trash2 size={14} /> Clear Session
            </button>
          </div>
        </div>

        <div style={{marginTop: '24px', textAlign: 'center', opacity: 0.3, fontSize: '0.7rem'}}>
          POWERED AGED™ <br/> © 2026 AI DOCUMENT ACCELERATOR
        </div>
      </aside>

      <main className="main-content">
        <div className="chat-panel glass">
          <div className="messages-container">
            {messages.length === 0 && !isThinking && (
              <div style={{height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.2, textAlign: 'center'}}>
                <SidebarIcon size={64} />
                <h2 style={{marginTop: '24px'}}>Awaiting Input</h2>
                <p>Select your document target and begin the stream.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role === 'user' ? 'message-user' : 'message-ai'}`}>
                {msg.role === 'user' ? (
                  <div style={{display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
                    <User size={18} style={{marginTop: '4px'}} />
                    <p>{msg.content}</p>
                  </div>
                ) : (
                  <div className="ai-bubble">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)'}}>
                            <Bot size={20} />
                            <span style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase'}}>Autonomous Intelligence</span>
                        </div>
                        <div className="action-row" style={{display: 'flex', gap: '8px'}}>
                            <button onClick={() => handleCopy(msg.content, idx)} title="Copy Text" className="icon-btn">
                                {copyStatus === idx ? <Check size={14} color="var(--accent-cyan)" /> : <Copy size={14} />}
                            </button>
                            <button onClick={() => handleDownloadDoc(msg.content, idx)} title="Download DOC" className="icon-btn">
                                <FileText size={14} />
                            </button>
                            <button onClick={() => handleDownloadPDF(msg.content)} title="Download PDF" className="icon-btn">
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="prose">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code {...props}>{children}</code>
                            );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {idx === messages.length - 1 && !isStreaming && nextActions.length > 0 && (
                      <div className="next-steps-container">
                        <h4 style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '0.85rem'}}>
                          <BookOpen size={16} /> Strategic Escalation
                        </h4>
                        <div className="next-steps-grid">
                          {nextActions.map((action, i) => (
                            <button key={i} className="step-btn" onClick={() => handleSendMessage(action)}>
                              {action}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {isThinking && (
              <div style={{display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--accent-cyan)', padding: '24px'}}>
                <Loader2 className="spinning" size={20} />
                <span style={{fontSize: '0.9rem', fontWeight: 500}}>Synthesizing Deep Context...</span>
              </div>
            )}

            {error && (
              <div className="glass" style={{padding: '16px 24px', borderLeft: '4px solid #ff4b4b', background: 'rgba(255,75,75,0.05)', alignSelf: 'center', maxWidth: '600px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '12px', color: '#ff4b4b'}}>
                  <AlertCircle size={20} />
                  <p><strong>System Breach:</strong> {error}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-wrapper">
              <textarea
                placeholder={`Query for ${docType === 'auto' ? 'General' : docType} as ${persona}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
              />
              <button 
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={isStreaming || isThinking || !inputText.trim()}
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
