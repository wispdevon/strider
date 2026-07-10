'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  const stored = window.localStorage.getItem('strider-theme');
  if (stored === 'light' || stored === 'dark') return stored;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

interface ThemeToggleProps {
  variant?: 'toolbar' | 'menu';
}

export default function ThemeToggle({ variant = 'toolbar' }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setMounted(true);
  }, []);

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  if (variant === 'menu') {
    return (
      <button
        type="button"
        aria-label={`Switch to ${nextTheme} mode`}
        className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel-strong)] rounded-lg transition-colors flex items-center justify-between"
        onClick={() => {
          setTheme(nextTheme);
          window.localStorage.setItem('strider-theme', nextTheme);
          applyTheme(nextTheme);
        }}
      >
        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        <span aria-hidden="true">{mounted && theme === 'dark' ? '☀️' : '🌙'}</span>
      </button>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="app-toolbar-button app-toolbar-button-neutral transition-all duration-300"
      onClick={() => {
        setTheme(nextTheme);
        window.localStorage.setItem('strider-theme', nextTheme);
        applyTheme(nextTheme);
      }}
    >
      <span aria-hidden="true">{mounted && theme === 'dark' ? '☀️' : '🌙'}</span>
    </motion.button>
  );
}
