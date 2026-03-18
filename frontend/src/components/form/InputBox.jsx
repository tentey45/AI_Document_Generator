const InputBox = ({ mode, prompt, setPrompt }) => {
  return (
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
  );
};

export default InputBox;
