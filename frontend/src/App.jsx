import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, GraduationCap, Send, Trash2, Sidebar as SidebarIcon, BookOpen, User, Bot, Loader2, RefreshCw, FileCode, Copy, Download, FileText, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

import './index.css';
import heroAsset from './assets/hero_ai.png';

function App() {
  // Always start with persona = null so landing page is shown
  const [persona, setPersona] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [nextActions, setNextActions] = useState([]);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('auto');
  const [copyStatus, setCopyStatus] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      // 1. Get the Raw URL and Print it for Debugging
      let rawUrl = import.meta.env.VITE_API_BASE_URL || '';
      console.log('App: rawUrl found in environment:', rawUrl);
      
      // 2. FORCED: Ignore old Render.com links completely
      if (rawUrl && rawUrl.includes('onrender.com')) {
        console.warn('App: Detected legacy Render URL. Ignoring for Vercel native /api.');
        rawUrl = '';
      }

      // 3. Determine if we are on Localhost or Production
      const isLocal = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1');
      
      // 4. Force /api for all non-local deployments
      const finalUrl = rawUrl || (!isLocal ? '/api' : 'http://127.0.0.1:8000');
      const API_URL = finalUrl.replace(/\/$/, '');
      
      console.log('App: Final API_URL target:', API_URL);
      
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
    const contentLines = text.split('**Next Steps:**')[0].trim().split('\n');
    const cleanLines = contentLines.map(line => {
        let l = line.trim();
        l = l.replace(/^[#]+\s+/, '');
        l = l.replace(/^[\*\-\+]\s+/, '• ');
        l = l.replace(/\*\*(.*?)\*\*/g, '$1');
        l = l.replace(/`(.*?)`/g, '$1');
        return l;
    });

    navigator.clipboard.writeText(cleanLines.join('\n')).then(() => {
      setCopyStatus(idx);
      setTimeout(() => setCopyStatus(null), 2000);
    });
  };

  const handleDownloadPDF = (content) => {
    const printWindow = window.open('', '_blank');
    const formattedContent = content.split('**Next Steps:**')[0]
      .replace(/^# (.*$)/gim, '<h1 style="color:#000;margin-bottom:20px;">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 style="color:#000;border-bottom:1px solid #ccc;padding-bottom:5px;margin-top:30px;">$1</h2>')
      .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
      .replace(/`(.*?)`/g, '<span style="color:#0056b3;font-family:monospace;font-weight:500;">$1</span>')
      .replace(/\n\n/gim, '<br><br>')
      .replace(/\n/gim, '<br>');

    printWindow.document.write(`
      <html><head><style>body{font-family:sans-serif;padding:60px;color:#000;line-height:1.8;max-width:850px;margin:0 auto;}</style></head><body>
      <div style="font-size:11px;color:#777;margin-bottom:40px;">PERSONA: ${persona.toUpperCase()} | ${new Date().toLocaleDateString()}</div>
      ${formattedContent}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  const handleDownloadDoc = (content, index) => {
    const lines = content.split('**Next Steps:**')[0].trim().split('\n');
    const paragraphs = lines.map(line => {
        const text = line.trim();
        if (text.startsWith('# ')) return new Paragraph({ text: text.replace('# ', ''), heading: HeadingLevel.HEADING_1 });
        if (text.startsWith('## ')) return new Paragraph({ text: text.replace('## ', ''), heading: HeadingLevel.HEADING_2 });
        const runs = [];
        const regex = /(\*\*.*?\*\*|`.*?`)/g;
        let match, lastIdx = 0;
        while ((match = regex.exec(text)) !== null) {
            if (match.index > lastIdx) runs.push(new TextRun(text.slice(lastIdx, match.index)));
            const chunk = match[0];
            if (chunk.startsWith('**')) runs.push(new TextRun({ text: chunk.replace(/\*\*/g, ''), bold: true }));
            else if (chunk.startsWith('`')) runs.push(new TextRun({ text: chunk.replace(/`/g, ''), color: "0056B3" }));
            lastIdx = regex.lastIndex;
        }
        if (lastIdx < text.length) runs.push(new TextRun(text.slice(lastIdx)));
        return new Paragraph({ children: runs.length > 0 ? runs : [new TextRun(text)] });
    });
    const doc = new Document({ sections: [{ children: paragraphs }] });
    Packer.toBlob(doc).then(blob => saveAs(blob, `AGED_Export_${index}.docx`));
  };

  if (!persona) {
    return <LandingPage onSelect={(mode) => setPersona(mode)} />;
  }  return (
    <div className="flex flex-col md:flex-row h-screen w-screen p-0 md:p-4 gap-0 md:gap-4 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass rounded-none border-t-0 border-x-0 relative z-50">
        <div className="flex items-center gap-2">
          <Sparkles className="text-aged-cyan" size={20} />
          <h2 className="text-sm font-bold tracking-widest text-white">AGED AI</h2>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 glass">
          <SidebarIcon size={18} className="text-aged-cyan" />
        </button>
      </div>

      {/* Sidebar - Animated Mobile Overlay */}
      <aside className={`
        fixed md:relative z-50 inset-y-0 left-0 w-[280px] md:w-[280px] 
        glass shadow-2xl md:shadow-none p-6 flex flex-col shrink-0 
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:translate-x-0 opacity-0 md:opacity-100'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-aged-cyan fill-aged-cyan" size={22} />
            <h2 className="text-lg font-bold">AGED CORE</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
             <Check size={20} className="text-aged-cyan" />
          </button>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          <div className="glass p-4 border-l-4 border-aged-cyan">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Active Persona</p>
            <h4 className="capitalize font-bold text-aged-cyan">{persona}</h4>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
              <FileCode size={12} /> Doc Format
            </p>
            <div className="relative">
              <select 
                value={docType} 
                onChange={(e) => setDocType(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-aged-cyan appearance-none cursor-pointer"
              >
                {docOptions[persona].map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <FileText size={14} />
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <button onClick={() => { setPersona(null); setIsSidebarOpen(false); }} className="glass py-2.5 flex items-center justify-center gap-2 text-xs font-semibold hover:border-aged-cyan transition-colors">
              <RefreshCw size={14} /> Reset Persona
            </button>
            <button onClick={() => { setMessages([]); setIsSidebarOpen(false); }} className="glass py-2.5 flex items-center justify-center gap-2 text-xs font-semibold text-red-400 hover:border-red-500/50 transition-colors">
              <Trash2 size={14} /> Clear Session
            </button>
          </div>
        </div>
      </aside>

      {/* Click overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="glass flex-1 flex flex-col overflow-hidden m-0 md:rounded-2xl border-none md:border md:border-white/10 relative z-10">
          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-10 scroll-smooth custom-scrollbar">
            {messages.length === 0 && !isThinking && (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-aged-cyan/20 blur-2xl rounded-full"></div>
                  <Bot size={64} className="text-aged-cyan relative" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">System Online</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">Enter a query to architect premium documentation or receive strategic guidance.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[95%] md:max-w-[85%] animate-message-in ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="bg-aged-cyan/10 border border-aged-cyan/20 px-5 md:px-6 py-3.5 md:py-4 rounded-2xl rounded-br-none shadow-[0_0_15px_rgba(0,242,255,0.05)]">
                    <div className="flex items-start gap-3">
                        <User size={16} className="mt-1 text-aged-cyan shrink-0" />
                        <p className="text-sm md:text-base leading-relaxed text-white/90">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="glass bg-white/[0.03] p-5 md:p-8 rounded-2xl md:rounded-3xl rounded-bl-none overflow-hidden relative group">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-aged-cyan">
                            <Bot size={18} />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">AGED v4.1 CORE</span>
                        </div>
                        <div className="flex gap-1.5 md:gap-2">
                             <button onClick={() => handleCopy(msg.content, idx)} title="Copy Content" className="w-8 h-8 md:w-9 md:h-9 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                {copyStatus === idx ? <Check size={14} className="text-aged-cyan" /> : <Copy size={14} />}
                            </button>
                            <button onClick={() => handleDownloadDoc(msg.content, idx)} title="Export DOCX" className="w-8 h-8 md:w-9 md:h-9 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                <FileText size={14} />
                            </button>
                            <button onClick={() => handleDownloadPDF(msg.content)} title="Export PDF" className="w-8 h-8 md:w-9 md:h-9 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                <Download size={14} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="prose prose-sm md:prose-base prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-white prose-headings:font-bold prose-headings:mb-4 prose-code:text-aged-cyan prose-code:bg-white/5 prose-code:px-1.5 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-4 rounded-xl overflow-hidden border border-white/10 bg-black/40">
                                <SyntaxHighlighter 
                                  style={vscDarkPlus} 
                                  language={match[1]} 
                                  PreTag="div" 
                                  customStyle={{ padding: '1.25rem', background: 'transparent' }}
                                  {...props}
                                >
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : ( <code className="bg-white/10 px-1.5 py-0.5 rounded text-aged-cyan text-[0.9em]" {...props}>{children}</code> );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {idx === messages.length - 1 && !isStreaming && nextActions.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-white/5">
                        <h4 className="flex items-center gap-2 text-aged-cyan text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
                          <BookOpen size={14} /> Strategic Escalation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {nextActions.map((action, i) => (
                            <button key={i} className="glass py-2.5 px-4 text-xs text-left hover:border-aged-cyan/50 hover:bg-aged-cyan/5 transition-all text-white/80" onClick={() => handleSendMessage(action)}>
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
              <div className="flex gap-3 items-center text-aged-cyan px-4 py-6">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">Neural Processing...</span>
              </div>
            )}

            {error && (
              <div className="glass p-4 border-l-4 border-red-500 bg-red-500/5 max-w-lg mx-auto mb-6">
                <div className="flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <p className="text-xs font-bold uppercase tracking-widest">Breach Detected: {error}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-8 mt-auto relative z-10">
            <div className="glass bg-white/5 border border-white/10 focus-within:border-aged-cyan/50 focus-within:ring-4 focus-within:ring-aged-cyan/5 p-2 md:p-3 flex items-center gap-3 md:gap-4 transition-all duration-300">
              <textarea
                placeholder={`Query for ${docType === 'auto' ? 'General' : docType} as ${persona}...`}
                className="flex-1 bg-transparent border-none text-white text-sm md:text-base resize-none outline-none py-2 px-3 md:px-4 max-h-40 min-h-[44px]"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
                }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                rows={1}
              />
              <button 
                className="bg-aged-cyan text-black w-11 md:w-12 h-11 md:h-12 rounded-xl flex items-center justify-center hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all shrink-0 shadow-lg"
                onClick={() => handleSendMessage()}
                disabled={isStreaming || isThinking || !inputText.trim()}
              >
                <Send size={20} />
              </button>
            </div>
            <p className="text-[9px] text-center text-slate-500 mt-3 uppercase tracking-[0.3em] font-medium opacity-50">AGED Integrated Intelligence v4.1 • Secure Core x64</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
