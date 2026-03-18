import { FileText, Copy, Download, Check, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus, tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { forwardRef, useEffect, useState } from 'react';

const ResultViewer = forwardRef(({ generatedContent, error, isGenerating, copied, handleCopy, handleDownload }, ref) => {
  const [currentTheme, setCurrentTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light');

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          setCurrentTheme(document.documentElement.getAttribute('data-theme'));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const syntaxTheme = currentTheme === 'dark' ? vscDarkPlus : tomorrow;

  if (isGenerating) {
    return (
      <section className="output-container" ref={ref}>
        <div className="output-header">
          <h2><FileText size={16} /> Generating...</h2>
        </div>
        <div className="output-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AGED is crafting your professional documentation...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="output-container" ref={ref}>
      <div className="output-header">
        <h2><FileText size={16} /> README.md</h2>
        {generatedContent && !error && (
          <div className="output-actions">
            <button className="opt-btn" onClick={handleCopy} title="Copy to Clipboard" style={{ padding: '4px 8px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button className="opt-btn" onClick={handleDownload} title="Download as Text" style={{ padding: '4px 8px' }}>
              <Download size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="output-content markdown-body" style={{ minHeight: '600px' }}>
        {error ? (
          <div className="error-state">
            <AlertCircle size={64} style={{ marginBottom: '1.5rem', display: 'block', margin: '0 auto' }} />
            <p>{error}</p>
          </div>
        ) : generatedContent ? (
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({node, inline, className, children, ...props}) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={syntaxTheme}
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
                )
              }
            }}
          >
            {generatedContent}
          </ReactMarkdown>
        ) : (
          <div className="placeholder" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '4rem 0' }}>
            <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Your documentation will appear here.</p>
          </div>
        )}
      </div>
    </section>
  );
});

ResultViewer.displayName = 'ResultViewer';

export default ResultViewer;
