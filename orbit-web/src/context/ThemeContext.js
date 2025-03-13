import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      // Dark mode colors
      root.style.setProperty('--color-primary', '#60A5FA');
      root.style.setProperty('--color-primary-dark', '#3B82F6');
      root.style.setProperty('--color-background', '#111827');
      root.style.setProperty('--color-surface', '#1F2937');
      root.style.setProperty('--color-text', '#F9FAFB');
      root.style.setProperty('--color-text-secondary', '#D1D5DB');
    } else {
      root.classList.remove('dark');
      // Light mode colors
      root.style.setProperty('--color-primary', '#3B82F6');
      root.style.setProperty('--color-primary-dark', '#2563EB');
      root.style.setProperty('--color-background', '#F9FAFB');
      root.style.setProperty('--color-surface', '#FFFFFF');
      root.style.setProperty('--color-text', '#111827');
      root.style.setProperty('--color-text-secondary', '#4B5563');
    }
  }, [darkMode]);

  // Listen for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('darkMode')) {
        setDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const value = {
    darkMode,
    toggleDarkMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
} 