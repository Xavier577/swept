import { createContext, useContext, useState, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

const ThemeContext = createContext(undefined);

const THEME_STORAGE_KEY = 'swept-theme';

// Get actual theme based on setting (resolves 'system' to actual theme)
function getEffectiveTheme(setting) {
  if (setting === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return setting;
}

export function ThemeProvider({ children }) {
  // themeSetting can be 'light', 'dark', or 'system'
  const [themeSetting, setThemeSetting] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    }
    return 'system'; // Default to system
  });

  // Resolved theme is always 'light' or 'dark'
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getEffectiveTheme(themeSetting)
  );

  // Update resolved theme when setting changes
  useEffect(() => {
    setResolvedTheme(getEffectiveTheme(themeSetting));
  }, [themeSetting]);

  // Apply theme class to document and persist to localStorage
  useEffect(() => {
    const root = document.documentElement;

    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem(THEME_STORAGE_KEY, themeSetting);
  }, [resolvedTheme, themeSetting]);

  // Listen for system preference changes (only matters when set to 'system')
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (themeSetting === 'system') {
        setResolvedTheme(getEffectiveTheme('system'));
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themeSetting]);

  // Listen for Tauri menu theme change
  useEffect(() => {
    let unlisten;

    const setupListener = async () => {
      unlisten = await listen('menu-theme-change', (event) => {
        const newTheme = event.payload;
        if (newTheme === 'light' || newTheme === 'dark' || newTheme === 'system') {
          setThemeSetting(newTheme);
        }
      });
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);

  const setTheme = (newSetting) => {
    if (newSetting === 'light' || newSetting === 'dark' || newSetting === 'system') {
      setThemeSetting(newSetting);
    }
  };

  const toggleTheme = () => {
    setThemeSetting((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme: resolvedTheme,        // The actual applied theme ('light' or 'dark')
    themeSetting,                // The user's setting ('light', 'dark', or 'system')
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
