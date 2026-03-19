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
      const isProd = !window.location.hostname.includes('localhost');
      const rawUrl = import.meta.env.VITE_API_BASE_URL || (isProd ? '/api' : 'http://127.0.0.1:8000');
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
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-aged-dark">
        <div className="glass max-w-2xl w-full p-8 md:p-12 text-center animate-message-in">
          <img src={heroAsset} alt="AI Engine" className="w-48 mx-auto mb-8 drop-shadow-[0_0_20px_rgba(0,242,255,0.4)]" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">A<span className="text-aged-cyan">GED</span></h1>
          <p className="text-slate-400 text-lg mb-10">Premium AI Document & Strategy Accelerator</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
                onClick={() => setPersona('developer')}
                className="glass p-8 text-left hover:border-aged-cyan hover:bg-aged-cyan/5 transition-all group"
            >
              <Code size={40} className="text-aged-cyan mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Developer Mode</h3>
              <p className="text-slate-400 text-sm">Automated READMEs, technical specs, and API documentation.</p>
            </button>
            <button 
                onClick={() => setPersona('learner')}
                className="glass p-8 text-left hover:border-aged-purple hover:bg-aged-purple/5 transition-all group"
            >
              <GraduationCap size={40} className="text-aged-purple mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Learner Mode</h3>
              <p className="text-slate-400 text-sm">Deep code discovery, architectural help, and mentored learning.</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen p-4 gap-4">
      {/* Sidebar - Collapses on Mobile */}
      <aside className="glass w-full md:w-[280px] p-6 flex flex-col shrink-0 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="text-aged-cyan fill-aged-cyan" size={24} />
          <h2 className="text-lg font-bold">AGED CORE</h2>
          <button onClick={() => setPersona(null)} className="md:hidden ml-auto text-slate-400"><RefreshCw size={18}/></button>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          <div className="glass p-4 border-l-4 border-aged-cyan">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Active Persona</p>
            <h4 className="capitalize font-bold text-aged-cyan">{persona}</h4>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
              <FileCode size={12} /> Documentation Type
            </p>
            <select 
              value={docType} 
              onChange={(e) => setDocType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm outline-none focus:border-aged-cyan appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {docOptions[persona].map(opt => (
                <option key={opt.value} value={opt.value} className="bg-slate-900">{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-auto hidden md:flex flex-col gap-3">
            <button onClick={() => setPersona(null)} className="glass py-2 flex items-center justify-center gap-2 text-sm hover:border-aged-cyan">
              <RefreshCw size={14} /> Switch Persona
            </button>
            <button onClick={() => setMessages([])} className="glass py-2 flex items-center justify-center gap-2 text-sm text-red-500 hover:border-red-500">
              <Trash2 size={14} /> Clear Session
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="glass flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scroll-smooth">
            {messages.length === 0 && !isThinking && (
              <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                <SidebarIcon size={64} />
                <h2 className="text-2xl mt-6">Awaiting Strategic Input</h2>
                <p className="text-sm">Initiate the stream to generate premium documentation.</p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`max-w-[95%] md:max-w-[85%] animate-message-in ${msg.role === 'user' ? 'ml-auto' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="bg-aged-cyan/10 border border-aged-cyan/20 px-6 py-4 rounded-3xl rounded-br-none">
                    <div className="flex items-start gap-3">
                        <User size={18} className="mt-1 shrink-0" />
                        <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="glass bg-white/[0.02] p-6 md:p-10 rounded-3xl rounded-bl-none">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-aged-cyan">
                            <Bot size={20} />
                            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Autonomous Core x64</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleCopy(msg.content, idx)} className="w-8 md:w-10 h-8 md:h-10 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                {copyStatus === idx ? <Check size={16} className="text-aged-cyan" /> : <Copy size={16} />}
                            </button>
                            <button onClick={() => handleDownloadDoc(msg.content, idx)} className="w-8 md:w-10 h-8 md:h-10 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                <FileText size={16} />
                            </button>
                            <button onClick={() => handleDownloadPDF(msg.content)} className="w-8 md:w-10 h-8 md:h-10 glass flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all">
                                <Download size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="prose prose-invert max-w-none prose-p:text-slate-300 prose-headings:text-aged-cyan prose-code:text-aged-cyan prose-code:bg-white/5 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <div className="my-4 rounded-xl overflow-hidden border border-white/10">
                                <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                                    {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              </div>
                            ) : ( <code className="bg-white/10 px-1.5 py-0.5 rounded text-aged-cyan" {...props}>{children}</code> );
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>

                    {idx === messages.length - 1 && !isStreaming && nextActions.length > 0 && (
                      <div className="mt-10 pt-8 border-t border-white/10">
                        <h4 className="flex items-center gap-2 text-aged-cyan text-xs font-bold uppercase tracking-widest mb-4">
                          <BookOpen size={16} /> Strategic Escalation
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {nextActions.map((action, i) => (
                            <button key={i} className="glass py-2 px-4 text-xs md:text-sm text-left hover:border-aged-cyan transition-all" onClick={() => handleSendMessage(action)}>
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
              <div className="flex gap-3 items-center text-aged-cyan px-6 py-8">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium tracking-wide">Synthesizing Context...</span>
              </div>
            )}

            {error && (
              <div className="glass p-4 border-l-4 border-red-500 bg-red-500/5 max-w-lg mx-auto">
                <div className="flex items-center gap-3 text-red-500">
                  <AlertCircle size={20} />
                  <p className="text-sm font-bold uppercase tracking-tight">System Breach: {error}</p>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 md:p-8 mt-auto">
            <div className="glass bg-white/5 focus-within:ring-2 focus-within:ring-aged-cyan/50 p-2 md:p-3 flex items-center gap-3 md:gap-4 transition-all">
              <textarea
                placeholder={`Query for ${docType === 'auto' ? 'General' : docType} as ${persona}...`}
                className="flex-1 bg-transparent border-none text-white text-sm md:text-base resize-none outline-none pl-2 md:pl-4 max-h-40"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                rows={1}
              />
              <button 
                className="bg-aged-cyan text-black w-10 md:w-12 h-10 md:h-12 rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                onClick={() => handleSendMessage()}
                disabled={isStreaming || isThinking || !inputText.trim()}
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
