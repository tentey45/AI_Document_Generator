import { useState, useRef } from 'react';
import { Sparkles, Code, GraduationCap, FileText, Copy, Download, Check, AlertCircle } from 'lucide-react';
import { marked } from 'marked';
import './index.css';

function App() {
  const [mode, setMode] = useState('developer');
  const [subOption, setSubOption] = useState('auto');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const outputRef = useRef(null);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setSubOption('auto');
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert(`Please enter a ${mode === 'developer' ? 'code snippet' : 'prompt'}.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt,
          user_type: mode,
          sub_option: subOption
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate document');
      }

      const data = await response.json();
      setGeneratedContent(data.content);
      
      if (window.innerWidth <= 1024 && outputRef.current) {
        outputRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    if (!generatedContent) return;
    const blob = new Blob([generatedContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aged-ai-${mode}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <Sparkles className="logo-icon" />
          <h1>A<span>GED</span></h1>
        </div>
        <nav>
          <span>AGED Doc Generator</span>
        </nav>
      </header>

      <main>
        <section className="controls">
          <div className="mode-selector">
            <button 
              className={`mode-btn ${mode === 'developer' ? 'active' : ''}`}
              onClick={() => handleModeChange('developer')}
            >
              <Code size={20} />
              <span>Developer</span>
            </button>
            <button 
              className={`mode-btn ${mode === 'student' ? 'active' : ''}`}
              onClick={() => handleModeChange('student')}
            >
              <GraduationCap size={20} />
              <span>Student</span>
            </button>
          </div>

          {mode === 'developer' ? (
            <div className="option-group">
              <label>Programming Language</label>
              <div className="options-grid">
                <button className={`opt-btn ${subOption === 'auto' ? 'active' : ''}`} onClick={() => setSubOption('auto')}>Auto-Detect</button>
                {['python', 'javascript', 'java', 'cpp'].map((lang) => (
                  <button 
                    key={lang}
                    className={`opt-btn ${subOption === lang ? 'active' : ''}`}
                    onClick={() => setSubOption(lang)}
                  >
                    {lang.charAt(0).toUpperCase() + lang.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="option-group">
              <label>Document Type</label>
              <div className="options-grid">
                <button className={`opt-btn ${subOption === 'auto' ? 'active' : ''}`} onClick={() => setSubOption('auto')}>Auto-Detect</button>
                <button className={`opt-btn ${subOption === 'academic' ? 'active' : ''}`} onClick={() => setSubOption('academic')}>Academic Document</button>
                <button className={`opt-btn ${subOption === 'proposal' ? 'active' : ''}`} onClick={() => setSubOption('proposal')}>Proposal Document</button>
                <button className={`opt-btn ${subOption === 'defense' ? 'active' : ''}`} onClick={() => setSubOption('defense')}>Defense Document</button>
                <button className={`opt-btn ${subOption === 'professional' ? 'active' : ''}`} onClick={() => setSubOption('professional')}>Professional Document</button>
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="prompt">{mode === 'developer' ? 'Source Code' : 'Topic / Prompt'}</label>
            <div className="textarea-wrapper">
              <textarea 
                id="prompt" 
                placeholder={mode === 'developer' ? 'Paste your code snippet here...' : 'Describe your topic or specific requirements here...'}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              ></textarea>
              <div className="status-indicator">
                <span className="dot"></span> AI Ready
              </div>
            </div>
          </div>

          <button 
            className="primary-btn" 
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <span>GENERATE DOCUMENT</span>
            <Sparkles size={20} />
          </button>
        </section>

        <section className="output-container" ref={outputRef}>
          <div className="output-header">
            <h2>Generated Output</h2>
            {generatedContent && !error && (
              <div className="output-actions">
                <button onClick={handleCopy} title="Copy to Clipboard">
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button onClick={handleDownload} title="Download as Text">
                  <Download size={18} />
                </button>
              </div>
            )}
          </div>
          
          <div className="output-content">
            {error ? (
              <div className="error-state" style={{ color: '#ff7b72', textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                <p>Something went wrong: {error}</p>
              </div>
            ) : generatedContent ? (
              <div dangerouslySetInnerHTML={{ __html: marked.parse(generatedContent) }} />
            ) : (
              <div className="placeholder">
                <FileText size={64} />
                <p>Your generated document will appear here...</p>
              </div>
            )}
          </div>

          {isGenerating && (
            <div className="loader-overlay">
              <div className="spinner"></div>
              <p>AGED is crafting your document...</p>
            </div>
          )}
        </section>
      </main>

      <footer>
        <p>&copy; 2026 AGED. Powered by Groq Llama-3.</p>
      </footer>
    </div>
  );
}

export default App;
