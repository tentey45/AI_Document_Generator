import { Sparkles, ArrowLeft } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const Header = ({ mode, onBack }) => {
  return (
    <div className="header-inner">
      <div className="header-left">
        <button className="back-btn" onClick={onBack} title="Change Persona">
          <ArrowLeft size={18} />
          <span>BACK</span>
        </button>
        <div className="logo">
          <Sparkles size={22} style={{ color: 'var(--accent-primary)' }} />
          <h1>AGED <span>AI</span></h1>
        </div>
      </div>
      
      <nav className="header-nav">
        <ThemeToggle />
        <span className="persona-badge">{mode === 'developer' ? 'DEVELOPER' : 'STUDENT'}</span>
      </nav>
    </div>
  );
};

export default Header;
