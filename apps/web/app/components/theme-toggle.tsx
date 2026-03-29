'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

const themes = ['dark', 'light', 'system'] as const;

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

const icons = { dark: MoonIcon, light: SunIcon, system: MonitorIcon };
const labels = { dark: 'Dark', light: 'Light', system: 'System' };

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 0); }, []);

  if (!mounted) {
    return (
      <button
        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${className}`}
        aria-label="Toggle theme"
      >
<<<<<<< HEAD
        <div className="w-3.5 h-3.5" />
=======
        <MoonIcon />
>>>>>>> origin/main
      </button>
    );
  }

  const current = (theme as typeof themes[number]) ?? 'dark';
  const currentIndex = themes.indexOf(current);
  const next = themes[(currentIndex + 1) % themes.length];
  const Icon = icons[current];

  return (
    <button
      onClick={() => setTheme(next)}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200 hover:scale-110 active:scale-95 ${className}`}
      aria-label={`Switch to ${next} theme (currently ${labels[current]})`}
      title={`${labels[current]} mode — click for ${labels[next]}`}
    >
      <Icon />
    </button>
  );
}
