'use client';

import Link from 'next/link';
import { Mail, Bell } from 'lucide-react';

interface MobileNavProps {
  onClose?: () => void;
}

const MOBILE_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/screener', label: 'Signals' },
  { href: '/backtest', label: 'Backtest' },
  { href: '/heatmap', label: 'Heatmap' },
  { href: '/paper-trading', label: 'Paper Trading' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/subscribe', label: 'Weekly Digest', icon: Mail },
  { href: '/notifications', label: 'Alerts', icon: Bell },
  { href: '/discord/server', label: 'Discord' },
] as const;

export function MobileNav({ onClose }: MobileNavProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      {MOBILE_LINKS.map((link, i) => (
        <Link
          key={link.href}
          href={link.href}
          className="flex items-center gap-2 text-xl font-semibold text-white opacity-0 animate-fade-up"
          style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
          onClick={onClose}
        >
          {'icon' in link && link.icon && <link.icon className="w-5 h-5" />}
          {link.label}
        </Link>
      ))}
    </div>
  );
}
