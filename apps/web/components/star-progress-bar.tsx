'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Star, X, ExternalLink } from 'lucide-react';

const GOAL = 1000;
const DISMISS_KEY = 'tc-star-bar-dismissed';
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const SHOW_DELAY_MS = 5000;

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

function getNextMilestone(stars: number): number {
  return MILESTONES.find((m) => m > stars) ?? GOAL;
}

export function StarProgressBar() {
  const pathname = usePathname();
  const isEmbed = pathname.startsWith('/embed');

  const [stars, setStars] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (isEmbed) return;

    // Check dismiss cooldown
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        if (!isNaN(ts) && Date.now() - ts < DISMISS_TTL_MS) {
          return;
        }
      }
    } catch { /* localStorage unavailable */ }

    let cancelled = false;
    let showTimer: ReturnType<typeof setTimeout> | null = null;

    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((data: { stars: number }) => {
        if (cancelled) return;
        setStars(data.stars ?? 4);
        showTimer = setTimeout(() => {
          setVisible(true);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setEntered(true));
          });
        }, SHOW_DELAY_MS);
      })
      .catch(() => {
        if (cancelled) return;
        setStars(4);
        showTimer = setTimeout(() => {
          setVisible(true);
          requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)));
        }, SHOW_DELAY_MS);
      });

    return () => {
      cancelled = true;
      if (showTimer) clearTimeout(showTimer);
    };
  }, [isEmbed]);

  const dismiss = () => {
    setEntered(false);
    setTimeout(() => setVisible(false), 300);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  if (isEmbed || !visible || stars === null) return null;

  const pct = Math.min((stars / GOAL) * 100, 100);
  const nextMilestone = getNextMilestone(stars);
  const toNext = nextMilestone - stars;

  return (
    <>
      <style>{`
        .star-bar-enter {
          transform: translateY(100%);
          opacity: 0;
        }
        .star-bar-entered {
          transform: translateY(0);
          opacity: 1;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        }
        .star-bar-progress-fill {
          transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div
        role="complementary"
        aria-label="GitHub star progress"
        className={`fixed bottom-0 left-0 right-0 will-change-transform ${entered ? 'star-bar-entered' : 'star-bar-enter'}`}
        style={{ zIndex: 40 }}
      >
        {/* Spacer so bar appears above the mobile bottom nav on small screens */}
        <div className="md:hidden h-16 pointer-events-none" />

        <div className="bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-700/60 px-4 py-2.5 shadow-[0_-4px_24px_rgba(0,0,0,0.4)]">
          {/* Progress bar track */}
          <div className="h-0.5 w-full bg-zinc-700/50 rounded-full overflow-hidden mb-2.5">
            <div
              className="star-bar-progress-fill h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
              style={{ width: `${pct}%` }}
              role="progressbar"
              aria-valuenow={stars}
              aria-valuemin={0}
              aria-valuemax={GOAL}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            {/* Left: star count + label */}
            <div className="flex items-center gap-2.5 min-w-0">
              <Star className="w-3.5 h-3.5 text-zinc-400 shrink-0 fill-zinc-400" />
              <span className="text-xs font-semibold text-white tabular-nums whitespace-nowrap">
                {stars.toLocaleString()}
                <span className="text-zinc-400 font-normal"> / 1,000 stars</span>
              </span>
              <span className="hidden sm:inline text-xs text-zinc-500 truncate">
                {toNext <= 0
                  ? '🎉 Goal reached!'
                  : `${toNext} until ${nextMilestone} ★`}
              </span>
            </div>

            {/* Right: CTA + dismiss */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href="https://github.com/naimkatiman/tradeclaw"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-black transition-colors whitespace-nowrap"
              >
                <Star className="w-3 h-3 fill-black" />
                <span>Star on GitHub</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
              </a>

              <button
                onClick={dismiss}
                aria-label="Dismiss star progress bar"
                className="w-6 h-6 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
