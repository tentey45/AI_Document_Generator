import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Code, GraduationCap, Send, Trash2, Sidebar as SidebarIcon, BookOpen, User, Bot, Loader2, RefreshCw, FileCode, Copy, Download, FileText, Check, AlertCircle, X, Plus, History, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';

import './index.css';
import heroAsset from './assets/hero_ai.png';
import agedLogo from './assets/aged_logo.png';
import LandingPage from './components/layout/LandingPage';

function App() {
  // Always start with persona = null so landing page is shown
  const [persona, setPersona] = useState(null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [nextActions, setNextActions] = useState([]);
  const [error, setError] = useState(null);
  const [docType, setDocType] = useState('auto');
  const [copyStatus, setCopyStatus] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [tokenCount, setTokenCount] = useState(0);
  const [promptHistory, setPromptHistory] = useState([]);
  const messagesEndRef = useRef(null);

  // Initialize API URL - Optimized for cross-device local testing and production deployment
  const hostname = window.location.hostname;
  const isLocalDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local');
  
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || (isLocalDev ? `http://${hostname}:8000` : '/api')).replace(/\/$/, '');

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

  // --- PERSISTENCE HOOKS ---
  // Save current state to persona-specific keys whenever it changes
  useEffect(() => {
    if (!persona) return;
    
    if (currentSessionId) {
      localStorage.setItem(`aged_session_id_${persona}`, currentSessionId);
    } else {
      localStorage.removeItem(`aged_session_id_${persona}`);
    }
    
    if (messages.length > 0) {
      localStorage.setItem(`aged_messages_${persona}`, JSON.stringify(messages));
    } else {
      localStorage.removeItem(`aged_messages_${persona}`);
    }

    if (promptHistory.length > 0) {
      localStorage.setItem(`aged_prompt_history_${persona}`, JSON.stringify(promptHistory));
    } else {
      localStorage.removeItem(`aged_prompt_history_${persona}`);
    }
    
    localStorage.setItem(`aged_input_text_${persona}`, inputText);
    localStorage.setItem('aged_active_persona', persona);
  }, [persona, currentSessionId, messages, inputText, promptHistory]);

  // Load state when persona is initialized/changed
  useEffect(() => {
    if (!persona) {
      // Clear all state when exiting to landing page
      setMessages([]);
      setCurrentSessionId(null);
      setInputText('');
      setPromptHistory([]);
      return;
    }

    // Immediately clear current messages before loading persona-specific ones
    setMessages([]);

    const savedSessionId = localStorage.getItem(`aged_session_id_${persona}`);
    const savedMessages = localStorage.getItem(`aged_messages_${persona}`);
    const savedInputText = localStorage.getItem(`aged_input_text_${persona}`);
    const savedPrompts = localStorage.getItem(`aged_prompt_history_${persona}`);

    if (savedSessionId) setCurrentSessionId(savedSessionId);
    else setCurrentSessionId(null);

    if (savedMessages) {
      try { setMessages(JSON.parse(savedMessages)); }
      catch (e) { setMessages([]); }
    }

    if (savedPrompts) {
      try { setPromptHistory(JSON.parse(savedPrompts)); }
      catch (e) { setPromptHistory([]); }
    }

    if (savedInputText) setInputText(savedInputText);

    fetchSessions();
  }, [persona]);

  // Initial load of the active persona on boot
  useEffect(() => {
    const activePersona = localStorage.getItem('aged_active_persona');
    if (activePersona) setPersona(activePersona);
  }, []);

  // Fetch session list
  const fetchSessions = async () => {
    if (!persona) return;
    try {
      const resp = await fetch(`${API_BASE}/sessions?persona=${persona}`);
      if (resp.ok) {
        const data = await resp.json();
        setSessions(data);
        const used = data.reduce((acc, s) => acc + (s.token_count || 0), 0);
        setTokenCount(used);
      }
    } catch (e) { console.error("History fetch failed", e); }
  };

  const handleNewChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setInputText('');
    if (persona) {
      localStorage.removeItem(`aged_messages_${persona}`);
      localStorage.removeItem(`aged_session_id_${persona}`);
    }
    setIsSidebarOpen(false);
  };

  const handleExit = () => {
    setPersona(null);
    setMessages([]);
    setCurrentSessionId(null);
    setInputText('');
    setIsSidebarOpen(false);
  };

  const selectSession = async (id) => {
    try {
      const resp = await fetch(`${API_BASE}/sessions/${id}`);
      if (resp.ok) {
        const data = await resp.json();
        setMessages(data.messages || []);
        setCurrentSessionId(id);
        setIsSidebarOpen(false);
      }
    } catch (e) { setError("Failed to load session history."); }
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      const resp = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
      if (resp.ok) {
        if (currentSessionId === id) handleNewChat();
        fetchSessions();
      }
    } catch (e) { console.error(e); }
  };

  const handleSendMessage = async (textOverride = null) => {
    const text = textOverride || inputText;
    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    
    // Add to local prompt history (Proves LocalStorage persistence)
    setPromptHistory(prev => {
      const filtered = prev.filter(p => p !== text);
      return [text, ...filtered].slice(0, 20);
    });

    // Simple word count and token estimation
    setWordCount(text.trim().split(/\s+/).length);
    setTokenCount(prev => prev + Math.ceil(text.length / 4));

    setInputText('');
    setIsThinking(true);
    setError(null);
    setNextActions([]);

    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      activeSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(activeSessionId);
    }

    try {
      const response = await fetch(`${API_BASE}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          user_context: persona,
          session_id: activeSessionId,
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
      // Refresh session list after a chat
      fetchSessions();

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
    const cleanContent = content.split('**Next Steps:**')[0].trim();

    // Formatting the content with modern typography and structured blocks
    const formattedContent = cleanContent
      .replace(/^# (.*$)/gim, '<div class="hero-section"><h1 class="main-title">$1</h1><div class="accent-bar"></div></div>')
      .replace(/^## (.*$)/gim, '<h2 class="section-title">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="subsection-title">$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, '<code class="inline-code">$1</code>')
      // Custom List Items
      .replace(/^ - (.*$)/gim, '<li class="list-item">$1</li>')
      .replace(/^ \* (.*$)/gim, '<li class="list-item">$1</li>')
      .replace(/\n\n/gim, '</p><p class="content-text">')
      .replace(/\n/gim, '<br>');

    printWindow.document.write(`
      <html>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Outfit:wght@400;700&display=swap" rel="stylesheet">
          <style>
            :root {
              --primary: #0084FF;
              --dark: #121217;
              --gray-light: #F8F9FA;
              --gray-medium: #E9ECEF;
              --gray-text: #495057;
            }
            * { box-sizing: border-box; }
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 60px 80px; 
              color: var(--dark); 
              line-height: 1.6; 
              max-width: 900px; 
              margin: 0 auto; 
              background: #fff;
            }
            .meta-header {
              font-size: 10px;
              color: #ADB5BD;
              text-transform: uppercase;
              letter-spacing: 0.15em;
              margin-bottom: 50px;
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid var(--gray-medium);
              padding-bottom: 10px;
            }
            .hero-section {
              margin-bottom: 40px;
              position: relative;
            }
            .main-title {
              font-family: 'Outfit', sans-serif;
              font-size: 38px;
              font-weight: 700;
              margin: 0 0 15px 0;
              color: var(--dark);
              line-height: 1.1;
            }
            .accent-bar {
              height: 4px;
              width: 60px;
              background: var(--primary);
              border-radius: 2px;
            }
            .section-title {
              font-family: 'Outfit', sans-serif;
              font-size: 22px;
              font-weight: 700;
              margin-top: 45px;
              margin-bottom: 20px;
              color: var(--dark);
              border-bottom: 2px solid var(--gray-light);
              padding-bottom: 8px;
            }
            .subsection-title {
              font-size: 16px;
              font-weight: 600;
              margin-top: 30px;
              margin-bottom: 10px;
              color: var(--primary);
            }
            .content-text {
              margin: 0 0 1.5em 0;
              color: var(--gray-text);
              font-size: 14.5px;
            }
            .inline-code {
              font-family: monospace;
              background: var(--gray-light);
              color: #D63384;
              padding: 2px 5px;
              border-radius: 4px;
              font-size: 0.9em;
            }
            .list-item {
              margin-bottom: 8px;
              list-style: none;
              position: relative;
              padding-left: 20px;
              font-size: 14.5px;
              color: var(--gray-text);
            }
            .list-item::before {
              content: "•";
              color: var(--primary);
              font-weight: bold;
              position: absolute;
              left: 0;
            }
            @media print {
              body { padding: 40px; font-size: 12pt; }
              .meta-header { position: absolute; top: 20px; width: calc(100% - 80px); }
              .hero-section { page-break-after: avoid; }
              h2, h3 { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="meta-header">
            <span>PERSONA: ${persona.toUpperCase()}</span>
            <span>DATE: ${new Date().toLocaleDateString()}</span>
            <span>AGED AI DOC ARCHITECT</span>
          </div>
          <div class="content-wrapper">
            <p class="content-text">${formattedContent}</p>
          </div>
          <footer style="margin-top: 100px; text-align: center; font-size: 10px; color: #ADB5BD; border-top: 1px solid var(--gray-medium); padding-top: 20px;">
            AGED (Artificial Intelligence Document & Design Engine) - Professional Series
          </footer>
        </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 800);
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
  } 
  
  return (
    <div className={`flex flex-col md:flex-row h-screen w-screen p-0 md:p-4 gap-0 md:gap-4 overflow-hidden theme-${persona} transition-colors duration-1000 bg-black`}>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 glass rounded-none border-t-0 border-x-0 relative z-50">
        <div className="flex items-center gap-2">
           <img src={agedLogo} alt="AGED" className="w-6 h-6 rounded-md object-cover mix-blend-screen" />
        </div>
      </div>

      {/* Sidebar - Animated Mobile Overlay */}
      <aside className={`
        fixed md:relative z-50 inset-y-0 left-0 w-[280px] md:w-[280px] 
        glass shadow-2xl md:shadow-none p-6 flex flex-col shrink-0 
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full md:w-0 md:px-0 md:opacity-0 pointer-events-none'}
      `}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg overflow-hidden border border-aged-cyan/50 shadow-[0_0_15px_rgba(0,242,255,0.3)]">
                <img src={agedLogo} alt="AGED" className="w-full h-full object-cover" />
             </div>
            <h2 className="text-lg font-bold">AGED CORE</h2>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 flex-1">
          <div className="glass-premium p-4 border-l-4 border-[var(--theme-primary)] bg-white/5">
            <p className="text-[10px] lowercase tracking-[0.2em] text-white/40 mb-1">Active Persona</p>
            <h4 className="capitalize font-black text-white flex items-center gap-2">
               {persona === 'developer' ? <Code size={16} className="text-[var(--theme-primary)]" /> : <GraduationCap size={16} className="text-[var(--theme-primary)]" />}
               {persona}
            </h4>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <History size={12} /> Chat History
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleNewChat}
                className="w-full text-left p-4 rounded-2xl border border-white/5 hover:border-[var(--theme-primary)]/40 bg-white/5 hover:bg-white/[0.08] transition-all text-[11px] font-black tracking-widest uppercase flex items-center gap-3 group"
              >
                <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                  <Plus size={16} />
                </div>
                <span>New Protocol</span>
              </button>
              
              {sessions.map(s => (
                <div key={s.id} className="group relative">
                  <button 
                    onClick={() => selectSession(s.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all text-[11px] leading-relaxed flex flex-col gap-2 pr-12
                      ${currentSessionId === s.id 
                        ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30 text-white shadow-[0_0_20px_var(--theme-glow)]' 
                        : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/[0.08] hover:border-white/10'}
                    `}
                  >
                    <span className="font-bold truncate w-full group-hover:text-white transition-colors">{s.title}</span>
                    <div className="flex items-center justify-between opacity-40">
                      <span className="text-[9px] uppercase tracking-widest">
                        {new Date(s.updated_at * 1000).toLocaleDateString()}
                      </span>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => deleteSession(e, s.id)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 opacity-0 group-hover:opacity-60 hover:opacity-100 hover:text-red-400 text-white/40 transition-all rounded-xl hover:bg-red-400/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <FileText size={12} /> Local Prompt Cache
            </p>
            <div className="flex flex-col gap-2">
              {promptHistory.length === 0 && (
                <p className="text-[9px] text-slate-600 italic px-2">No locally cached prompts yet.</p>
              )}
              {promptHistory.map((p, i) => (
                <button 
                  key={i}
                  onClick={() => setInputText(p)}
                  className="w-full text-left p-2 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/5 transition-all text-[9px] text-slate-500 hover:text-white truncate"
                  title={p}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button onClick={handleExit} className="glass py-3.5 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:border-red-500/50 hover:text-red-400 transition-all rounded-2xl bg-white/5">
              <LogOut size={16} /> Exit Workspace
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
      <main className="flex-1 flex flex-col h-full overflow-hidden relative glass bg-black/40 md:rounded-3xl border-white/5 mx-0 md:mx-2">
        
        {/* Modern Navigation Header */}
        <header className="absolute top-0 left-0 right-0 p-4 md:p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 to-transparent backdrop-blur-md border-b border-white/5">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2.5 glass bg-white/5 border-white/10 hover:border-[var(--theme-primary)] text-[var(--theme-primary)] hover:text-white transition-all rounded-2xl group ring-1 ring-white/10"
              title="Menu"
            >
              <SidebarIcon size={20} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">System Protocol</span>
              <span className="text-sm font-bold capitalize text-white flex items-center gap-2">
                {persona === 'developer' ? <Code size={14} className="text-[var(--theme-primary)]" /> : <GraduationCap size={14} className="text-[var(--theme-primary)]" />}
                {persona} Mode
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10">
                <div className="w-2 h-2 rounded-full bg-[var(--theme-primary)] animate-pulse shadow-[0_0_10px_var(--theme-glow)]"></div>
                <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Nodes Online</span>
             </div>
             
             <button 
            onClick={handleExit} 
            className="pointer-events-auto p-2.5 glass-premium bg-white/5 hover:border-red-500/50 text-white/50 hover:text-red-400 transition-all rounded-2xl flex items-center gap-3 group px-4"
          >
            <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-700" />
            <span className="text-[10px] font-black tracking-widest hidden md:inline uppercase">Reset Core</span>
          </button>
          </div>
        </header>

        <div className="flex-1 flex flex-col overflow-hidden m-0 md:rounded-tl-2xl relative z-10 transition-all duration-500">
          <div className="flex-1 overflow-y-auto px-4 md:px-0 space-y-10 scroll-smooth custom-scrollbar mt-14 md:mt-20">
            {/* Centered Document Workspace */}
            <div className="max-w-4xl mx-auto w-full pb-32">
              
              {messages.length === 0 && !isThinking && (
                <div className="h-[60vh] flex flex-col items-center justify-center opacity-60 text-center px-6 transition-all duration-700">
                  <div className="relative mb-10 transform scale-125">
                    <div className="absolute inset-0 bg-aged-cyan/20 blur-[80px] rounded-full animate-pulse"></div>
                    <img src={agedLogo} alt="AGED" className="w-24 h-24 md:w-32 md:h-32 object-cover relative z-10 filter drop-shadow-[0_0_30px_rgba(0,242,255,0.4)] mix-blend-screen" />
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-6">Document Architect</h2>
                  <p className="text-base md:text-lg text-slate-300 mt-2 max-w-sm mx-auto leading-relaxed font-medium">
                    Paste your code for documentation or describe what you want to create.
                  </p>
                  <div className="mt-8 px-4 py-2 rounded-full glass bg-aged-cyan/5 border-aged-cyan/20 text-[11px] text-aged-cyan font-bold tracking-[0.2em] uppercase">
                    Initialize System Protocol: {persona?.toUpperCase()}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                // Extract intent analysis if it exists
                let displayContent = msg.content;
                let intentAnalysis = null;
                const intentMatch = displayContent.match(/<intent>(.*?)<\/intent>/s);
                if (intentMatch) {
                  intentAnalysis = intentMatch[1].trim();
                  displayContent = displayContent.replace(intentMatch[0], '').trim();
                }

                return (
                  <div key={idx} className={`mb-10 animate-message-in ${msg.role === 'user' ? 'max-w-2xl ml-auto' : 'w-full'}`}>
                    {msg.role === 'user' ? (
                      <div className="bg-aged-cyan/10 border border-aged-cyan/20 px-6 py-4 rounded-3xl rounded-br-none shadow-[0_0_20px_rgba(0,242,255,0.03)] backdrop-blur-sm">
                        <div className="flex items-start gap-4">
                          <User size={18} className="mt-1.5 text-aged-cyan shrink-0" />
                          <p className="text-sm md:text-base leading-relaxed text-white/90 font-medium">{displayContent}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="relative group">
                        {/* Thinking Layer - 1-2 lines intent */}
                        {intentAnalysis && (
                          <div className="mb-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-3 animate-message-in">
                            <Bot size={14} className="text-aged-cyan/50" />
                            <div className="flex-1">
                              <p className="text-[10px] font-bold text-aged-cyan/40 uppercase tracking-[0.2em] mb-0.5">AGED Intent Analysis</p>
                              <p className="text-[11px] italic text-slate-400 leading-relaxed font-medium">"{intentAnalysis}"</p>
                            </div>
                          </div>
                        )}

                        {/* Document Result - Canva Style */}
                        <div className="glass bg-white/[0.02] border-white/5 p-6 md:p-12 rounded-[2rem] rounded-bl-none overflow-hidden relative shadow-2xl">
                          <div className="flex justify-between items-center mb-10 pb-6 border-bottom border-white/5">
                            <div className="flex items-center gap-3 text-aged-cyan">
                              <Bot size={22} className="opacity-80" />
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase tracking-[0.25em] opacity-50">AGED INTELLIGENCE</span>
                                <span className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{persona.toUpperCase()} MODE</span>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => handleCopy(displayContent, idx)} title="Copy" className="w-10 h-10 glass bg-white/5 border-white/10 flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all rounded-xl">
                                {copyStatus === idx ? <Check size={16} className="text-aged-cyan" /> : <Copy size={16} />}
                              </button>
                              <button onClick={() => handleDownloadPDF(displayContent)} title="PDF" className="w-10 h-10 glass bg-white/5 border-white/10 flex items-center justify-center text-slate-400 hover:text-aged-cyan hover:border-aged-cyan transition-all rounded-xl">
                                <Download size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="prose-canva">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                              code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <div className="my-8 rounded-2xl overflow-hidden border border-white/10 bg-black/60 shadow-inner">
                                    <div className="bg-white/5 px-4 py-2 flex items-center justify-between border-b border-white/5">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{match[1]} SOURCE</span>
                                      <div className="flex gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400/30"></div><div className="w-2 h-2 rounded-full bg-yellow-400/30"></div><div className="w-2 h-2 rounded-full bg-green-400/30"></div></div>
                                    </div>
                                    <SyntaxHighlighter
                                      style={vscDarkPlus}
                                      language={match[1]}
                                      PreTag="div"
                                      customStyle={{ padding: '2rem', background: 'transparent', fontSize: '13px' }}
                                      {...props}
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  </div>
                                ) : (<code className="bg-aged-cyan/10 px-2 py-0.5 rounded text-aged-cyan text-[0.85em] font-mono border border-aged-cyan/20" {...props}>{children}</code>);
                              }
                            }}
                            >
                              {displayContent}
                            </ReactMarkdown>
                          </div>

                          {idx === messages.length - 1 && !isStreaming && nextActions.length > 0 && (
                            <div className="mt-16 pt-10 border-t border-white/5">
                              <h4 className="flex items-center gap-2 text-aged-cyan text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                                <BookOpen size={16} className="opacity-70" /> Strategic Escalation
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {nextActions.map((action, i) => (
                                  <button key={i} className="glass py-4 px-5 text-[11px] font-bold text-left hover:border-aged-cyan/50 hover:bg-aged-cyan/5 transition-all text-white/50 hover:text-white rounded-2xl border-white/5" onClick={() => handleSendMessage(action)}>
                                    {action}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {isThinking && (
                <div className="flex gap-4 items-center text-aged-cyan px-2 py-8 animate-pulse">
                  <div className="relative">
                    <Loader2 className="animate-spin text-aged-cyan/50" size={24} />
                    <Bot size={12} className="absolute inset-0 m-auto text-aged-cyan" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Architectural Processing...</span>
                </div>
              )}

              {error && (
                <div className="glass p-6 border-l-4 border-red-500 bg-red-500/5 max-w-2xl mx-auto my-12 animate-shake">
                  <div className="flex items-center gap-4 text-red-500 mb-2">
                    <AlertCircle size={24} />
                    <p className="text-xs font-black uppercase tracking-widest">Protocol Breach: Communication Failed</p>
                  </div>
                  <p className="text-sm text-red-400/80 mb-4 pl-10 underline decoration-dotted">{error}</p>
                  <div className="pl-10 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
                    System Note: Ensure backend is running and reachable at <span className="text-aged-cyan">{API_BASE}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="sticky bottom-0 p-4 md:p-10 z-30 transition-all duration-500 mt-auto bg-gradient-to-t from-black via-black/80 to-transparent">
            <div className="max-w-4xl mx-auto w-full relative">
              <div className="glass-premium bg-white/5 border-white/10 focus-within:border-[var(--theme-primary)]/40 focus-within:bg-white/10 p-2 md:p-3 flex items-end gap-3 transition-all duration-500 rounded-3xl shadow-2xl relative group">
                <textarea
                  placeholder={persona === 'developer' ? "Paste code or describe the document to generate..." : "Paste code and ask what you want to understand..."}
                  className="flex-1 bg-transparent border-none text-white text-sm md:text-base resize-none outline-none py-4 px-4 md:px-6 max-h-60 min-h-[56px] font-medium leading-relaxed custom-scrollbar placeholder:text-white/20"
                  value={inputText}
                  onChange={(e) => {
                    setInputText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 240)}px`;
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  rows={1}
                />
                <button
                  className="bg-[var(--theme-primary)] text-black w-12 md:w-14 h-12 md:h-14 rounded-2xl flex items-center justify-center send-button-glow disabled:opacity-30 disabled:grayscale transition-all shrink-0 mb-1 group-hover:scale-105"
                  onClick={() => handleSendMessage()}
                  disabled={isStreaming || isThinking || !inputText.trim()}
                >
                  <Send size={22} fill="currentColor" />
                </button>
              </div>
              
              {/* Feedback subtle counters */}
              <div className="mt-5 px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)]"></div> 
                    Words: {wordCount}
                  </span>
                  <span className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] shadow-[0_0_10px_var(--theme-glow)]"></div> 
                    Tokens: {tokenCount.toLocaleString()}
                  </span>
                </div>
                {inputText.length === 0 && messages.length > 0 && (
                  <p className="text-[10px] text-[var(--theme-primary)]/40 italic font-bold uppercase tracking-widest">
                    Ready for next command
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
