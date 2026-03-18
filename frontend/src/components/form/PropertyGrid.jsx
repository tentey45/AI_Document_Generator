const PropertyGrid = ({ mode, subOption, setSubOption, docStyle, setDocStyle }) => {
  const isDeveloper = mode === 'developer';

  return (
    <div className="property-grid-container">
      {/* Step 1: Context Picker */}
      <div className="option-group">
        <label>{isDeveloper ? 'Programming Language' : 'Document Type'}</label>
        <div className="options-grid">
          <button 
            className={`opt-btn ${subOption === 'auto' ? 'active' : ''}`} 
            onClick={() => setSubOption('auto')}
          >
            Auto-Detect
          </button>
          
          {isDeveloper ? (
            ['python', 'javascript', 'java', 'cpp', 'html', 'css'].map((lang) => (
              <button 
                key={lang}
                className={`opt-btn ${subOption === lang ? 'active' : ''}`}
                onClick={() => setSubOption(lang)}
              >
                {lang === 'cpp' ? 'C++' : lang.toUpperCase()}
              </button>
            ))
          ) : (
            ['academic', 'proposal', 'defense', 'professional'].map((type) => (
              <button 
                key={type}
                className={`opt-btn ${subOption === type ? 'active' : ''}`}
                onClick={() => setSubOption(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Step 2: Style Picker (Only for Developers as per specific styles) */}
      {isDeveloper && (
        <div className="option-group">
          <label>Documentation Style</label>
          <div className="options-grid">
            {['developer', 'professional', 'simple'].map((style) => (
              <button 
                key={style}
                className={`opt-btn ${docStyle === style ? 'active' : ''}`}
                onClick={() => setDocStyle(style)}
              >
                {style.charAt(0).toUpperCase() + style.slice(1)} Style
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PropertyGrid;
