'use client';

import { useEffect, useState } from 'react';
import { Sprout, Zap, Flame, Gem, Rocket, Trophy, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface GitHubStats {
  stars: number;
}

interface MilestoneInfo {
  threshold: number;
  label: string;
  icon: LucideIcon;
  tweet: string;
}

const MILESTONES: MilestoneInfo[] = [
  {
    threshold: 10,
    label: '10 Stars',
    icon: Sprout,
    tweet: 'TradeClaw just hit 10 GitHub stars! 🌱 The open-source AI trading signals platform is gaining traction. Check it out: https://github.com/naimkatiman/tradeclaw #opensource #trading',
  },
  {
    threshold: 25,
    label: '25 Stars',
    icon: Zap,
    tweet: 'TradeClaw just hit 25 GitHub stars! ⚡ Momentum building for this open-source AI trading signals platform. Star it now: https://github.com/naimkatiman/tradeclaw #algotrading',
  },
  {
    threshold: 50,
    label: '50 Stars',
    icon: Flame,
    tweet: 'TradeClaw is on fire — 50 GitHub stars! 🔥 Self-hosted AI trading signals for forex, crypto & metals. Free forever: https://github.com/naimkatiman/tradeclaw #trading #opensource',
  },
  {
    threshold: 100,
    label: '100 Stars',
    icon: Gem,
    tweet: 'TradeClaw hit 100 GitHub stars! 💎 Triple digits for this open-source AI trading signals platform. Join the community: https://github.com/naimkatiman/tradeclaw #tradingbot',
  },
  {
    threshold: 250,
    label: '250 Stars',
    icon: Rocket,
    tweet: 'TradeClaw is going viral — 250 GitHub stars! 🚀 The open-source AI trading signals platform everyone is talking about. Star it: https://github.com/naimkatiman/tradeclaw',
  },
  {
    threshold: 500,
    label: '500 Stars',
    icon: Trophy,
    tweet: 'TradeClaw reached 500 GitHub stars! 🏆 Half-way to 1,000 stars on this incredible open-source AI trading signals platform. Check it out: https://github.com/naimkatiman/tradeclaw',
  },
  {
    threshold: 1000,
    label: '1,000 Stars',
    icon: Sparkles,
    tweet: 'TradeClaw is LEGENDARY — 1,000 GitHub stars! 🌟 The open-source AI trading signals platform has made it. Join thousands of traders: https://github.com/naimkatiman/tradeclaw',
  },
];

const LS_KEY = 'tc-last-milestone-seen';

export function MilestoneCelebrationModal() {
  const [milestone, setMilestone] = useState<MilestoneInfo | null>(null);
  const [stars, setStars] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((data: GitHubStats) => {
        if (!mounted) return;
        const currentStars = data.stars;
        if (mounted) setStars(currentStars);

        let lastSeenRaw: string | null = null;
        try { lastSeenRaw = localStorage.getItem(LS_KEY); } catch { /* ignore */ }
        const reached = [...MILESTONES].reverse().find((m) => currentStars >= m.threshold);

        // First-time visitor: silently record the current milestone so they never
        // see a celebration for something they didn't witness crossing.
        if (lastSeenRaw === null) {
          try {
            localStorage.setItem(LS_KEY, String(reached?.threshold ?? 0));
          } catch { /* ignore */ }
          return;
        }

        const lastSeen = parseInt(lastSeenRaw, 10) || 0;
        if (reached && reached.threshold > lastSeen) {
          if (mounted) setMilestone(reached);
          if (mounted) setVisible(true);
        }
      })
      .catch(() => {});

    return () => { mounted = false; };
  }, []);

  const dismiss = () => {
    if (milestone) {
      try { localStorage.setItem(LS_KEY, String(milestone.threshold)); } catch { /* ignore */ }
    }
    setVisible(false);
  };

  if (!visible || !milestone) return null;

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(milestone.tweet)}`;

  return (
    <>
      {/* CSS confetti particles */}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        .confetti-piece {
          position: fixed;
          width: 8px;
          height: 8px;
          top: -10px;
          animation: confetti-fall linear forwards;
          pointer-events: none;
          z-index: 9999;
          border-radius: 2px;
        }
      `}</style>

      {/* Confetti pieces */}
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${(i / 24) * 100}%`,
            backgroundColor: ['#10b981', '#34d399', '#f59e0b', '#fbbf24', '#6ee7b7', '#a78bfa', '#f472b6'][i % 7],
            animationDuration: `${2 + (i % 5) * 0.4}s`,
            animationDelay: `${(i % 8) * 0.15}s`,
          }}
        />
      ))}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
        onClick={dismiss}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Milestone reached: ${milestone.label}`}
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
      >
        <div className="relative w-full max-w-sm rounded-2xl border border-amber-500/40 bg-[var(--bg-card)] p-8 text-center shadow-2xl shadow-amber-500/10 overflow-hidden">
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.12) 0%, transparent 70%)' }}
          />

          {/* Close button */}
          <button
            onClick={dismiss}
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] transition-colors"
            aria-label="Dismiss"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="relative space-y-4">
            <div className="flex justify-center"><milestone.icon className="w-14 h-14 text-amber-300" /></div>
            <div>
              <h2 className="text-2xl font-black text-amber-300">Milestone Reached!</h2>
              <p className="text-lg font-bold text-white mt-1">{milestone.label}</p>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              TradeClaw just crossed <strong className="text-white">{stars.toLocaleString()} stars</strong> on GitHub!
            </p>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={tweetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-white/10 px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.742l7.732-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Share on X / Twitter
              </a>
              <button
                onClick={dismiss}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-black transition-colors"
              >
                Keep Building
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
