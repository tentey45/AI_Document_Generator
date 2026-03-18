import { Code, GraduationCap, ArrowRight } from 'lucide-react';

const LandingPage = ({ onSelect }) => {
  return (
    <div className="landing-container">
      <div className="landing-hero">
        <h1 className="landing-title">AGED <span>AI</span></h1>
        <p className="landing-subtitle">Professional AI Document Architect</p>
        <p className="landing-description">
          Generate high-fidelity technical documentation, academic proposals, and professional reports instantly.
        </p>
      </div>

      <div className="selection-grid">
        <div className="selection-card developer" onClick={() => onSelect('developer')}>
          <div className="card-icon">
            <Code size={48} />
          </div>
          <h2>Developer</h2>
          <p>Document your code with technical precision, logic traces, and best practices.</p>
          <div className="card-footer">
            <span>GET STARTED</span>
            <ArrowRight size={16} />
          </div>
        </div>

        <div className="selection-card student" onClick={() => onSelect('student')}>
          <div className="card-icon">
            <GraduationCap size={48} />
          </div>
          <h2>Student</h2>
          <p>Craft academic papers, project proposals, and defense summaries with ease.</p>
          <div className="card-footer">
            <span>GET STARTED</span>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
