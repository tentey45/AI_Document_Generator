import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

const ThemeToggle = () => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle Theme">
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
    </button>
  );
};

export default ThemeToggle;
