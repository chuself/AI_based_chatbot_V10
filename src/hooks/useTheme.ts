
import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('app-theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    // Default to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove both classes first
    root.classList.remove('light', 'dark');
    
    // Add the current theme class
    root.classList.add(theme);
    
    // Store the preference
    localStorage.setItem('app-theme', theme);
    
    // Update meta theme-color for mobile browsers with warm colors
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1e1b4b' : '#fdf2f8');
    }

    // Update body background with warm gradient
    document.body.style.background = theme === 'dark' 
      ? 'linear-gradient(135deg, rgba(219, 39, 119, 0.1), rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1), rgba(34, 197, 94, 0.1))'
      : 'linear-gradient(135deg, rgba(252, 231, 243, 1), rgba(219, 234, 254, 1), rgba(243, 232, 255, 1), rgba(220, 252, 231, 1))';
  }, [theme]);

  const toggleTheme = () => {
    setTheme(current => current === 'light' ? 'dark' : 'light');
  };

  return { theme, setTheme, toggleTheme };
};
