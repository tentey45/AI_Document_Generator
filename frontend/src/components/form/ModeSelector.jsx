import { Code, GraduationCap } from 'lucide-react';

const ModeSelector = ({ mode, onModeChange }) => {
  return (
    <div className="mode-selector">
      <button 
        className={`mode-btn ${mode === 'developer' ? 'active' : ''}`}
        onClick={() => onModeChange('developer')}
      >
        <Code size={20} />
        <span>Developer</span>
      </button>
      <button 
        className={`mode-btn ${mode === 'student' ? 'active' : ''}`}
        onClick={() => onModeChange('student')}
      >
        <GraduationCap size={20} />
        <span>Student</span>
      </button>
    </div>
  );
};

export default ModeSelector;
