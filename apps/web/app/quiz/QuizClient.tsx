'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap,
  TrendingUp,
  Target,
  Bot,
  ArrowRight,
  ArrowLeft,
  Star,
  Share2,
  RotateCcw,
  ShieldCheck,
  Flame,
  BarChart3,
  Crosshair,
  RefreshCw,
  Gauge,
  CheckCircle2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProfileKey = 'scalper' | 'swing' | 'position' | 'algo';

interface Option {
  label: string;
  icon: LucideIcon;
  value: ProfileKey;
}

interface Question {
  id: number;
  title: string;
  subtitle: string;
  options: Option[];
}

interface Profile {
  key: ProfileKey;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  color: string;
  description: string;
  pairs: string[];
  timeframes: string[];
  confidenceThreshold: string;
  signalTypes: string[];
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'How long do you hold a trade?',
    subtitle: 'Your trading style',
    options: [
      { label: 'Seconds to minutes', icon: Zap, value: 'scalper' },
      { label: 'Hours to days', icon: TrendingUp, value: 'swing' },
      { label: 'Weeks to months', icon: Target, value: 'position' },
      { label: 'I let algorithms decide', icon: Bot, value: 'algo' },
    ],
  },
  {
    id: 2,
    title: 'What\'s your risk appetite?',
    subtitle: 'Risk tolerance',
    options: [
      { label: 'High risk, high reward', icon: Flame, value: 'scalper' },
      { label: 'Balanced risk-reward', icon: ShieldCheck, value: 'swing' },
      { label: 'Conservative, capital preservation', icon: Target, value: 'position' },
      { label: 'Calculated, data-driven', icon: BarChart3, value: 'algo' },
    ],
  },
  {
    id: 3,
    title: 'Which assets interest you most?',
    subtitle: 'Preferred markets',
    options: [
      { label: 'Crypto (BTC, ETH, SOL)', icon: Zap, value: 'scalper' },
      { label: 'Forex (EUR/USD, GBP/USD)', icon: TrendingUp, value: 'swing' },
      { label: 'Metals & commodities (Gold, Silver)', icon: Target, value: 'position' },
      { label: 'All of the above, systematically', icon: Bot, value: 'algo' },
    ],
  },
  {
    id: 4,
    title: 'How experienced are you?',
    subtitle: 'Experience level',
    options: [
      { label: 'Beginner, learning the ropes', icon: RefreshCw, value: 'swing' },
      { label: 'Intermediate, profitable sometimes', icon: TrendingUp, value: 'scalper' },
      { label: 'Advanced, years of experience', icon: Target, value: 'position' },
      { label: 'Quant / developer background', icon: Bot, value: 'algo' },
    ],
  },
  {
    id: 5,
    title: 'Which signal type excites you?',
    subtitle: 'Signal preference',
    options: [
      { label: 'Momentum — ride the wave', icon: Gauge, value: 'scalper' },
      { label: 'Reversal — catch the turn', icon: RefreshCw, value: 'swing' },
      { label: 'Breakout — catch the move', icon: Crosshair, value: 'position' },
      { label: 'Multi-signal confluence', icon: Bot, value: 'algo' },
    ],
  },
];

const PROFILES: Record<ProfileKey, Profile> = {
  scalper: {
    key: 'scalper',
    title: 'The Scalper',
    subtitle: 'Speed is your edge',
    icon: Zap,
    color: 'text-yellow-400',
    description:
      'You thrive on fast-paced action and quick profits. You watch charts like a hawk and capitalize on micro-movements. TradeClaw\'s real-time signals are built for traders like you.',
    pairs: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'EUR/USD'],
    timeframes: ['1m', '5m', '15m'],
    confidenceThreshold: '60%+',
    signalTypes: ['Momentum', 'Breakout'],
  },
  swing: {
    key: 'swing',
    title: 'The Swing Trader',
    subtitle: 'Patience meets precision',
    icon: TrendingUp,
    color: 'text-emerald-400',
    description:
      'You capture multi-day moves by reading market structure. You let winners run and cut losers short. TradeClaw\'s multi-timeframe analysis fits your style perfectly.',
    pairs: ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD'],
    timeframes: ['1H', '4H', '1D'],
    confidenceThreshold: '70%+',
    signalTypes: ['Reversal', 'Momentum'],
  },
  position: {
    key: 'position',
    title: 'The Position Trader',
    subtitle: 'Big picture, big moves',
    icon: Target,
    color: 'text-blue-400',
    description:
      'You think in weeks and months, not minutes. You focus on macro trends and fundamentals-backed technical setups. TradeClaw\'s high-confidence signals match your conviction-based approach.',
    pairs: ['XAU/USD', 'BTC/USD', 'EUR/USD', 'US30'],
    timeframes: ['1D', '1W'],
    confidenceThreshold: '80%+',
    signalTypes: ['Breakout', 'Trend Following'],
  },
  algo: {
    key: 'algo',
    title: 'The Algo Trader',
    subtitle: 'Data over emotion',
    icon: Bot,
    color: 'text-purple-400',
    description:
      'You build systems, not gut feelings. You backtest everything and trust the numbers. TradeClaw\'s API and strategy builder were designed with you in mind.',
    pairs: ['All supported pairs'],
    timeframes: ['Multi-timeframe'],
    confidenceThreshold: '75%+ (configurable)',
    signalTypes: ['Multi-signal confluence'],
  },
};

const STORAGE_KEY = 'tradeclaw_quiz_result';

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function QuizClient() {
  const [step, setStep] = useState(-1); // -1 = intro
  const [answers, setAnswers] = useState<ProfileKey[]>([]);
  const [result, setResult] = useState<ProfileKey | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  // Load saved result
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && saved in PROFILES) {
        setTimeout(() => {
          setResult(saved as ProfileKey);
          setStep(QUESTIONS.length); // jump to results
        }, 0);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  const computeResult = useCallback((allAnswers: ProfileKey[]): ProfileKey => {
    const counts: Record<ProfileKey, number> = { scalper: 0, swing: 0, position: 0, algo: 0 };
    for (const a of allAnswers) counts[a]++;
    let max: ProfileKey = 'swing';
    let maxCount = 0;
    for (const [key, count] of Object.entries(counts)) {
      if (count > maxCount) {
        maxCount = count;
        max = key as ProfileKey;
      }
    }
    return max;
  }, []);

  const handleAnswer = useCallback(
    (value: ProfileKey) => {
      const newAnswers = [...answers, value];
      setAnswers(newAnswers);
      setDirection('forward');

      if (step + 1 >= QUESTIONS.length) {
        const r = computeResult(newAnswers);
        setResult(r);
        try {
          localStorage.setItem(STORAGE_KEY, r);
        } catch {
          // ignore
        }
      }
      setStep((s) => s + 1);
    },
    [answers, step, computeResult],
  );

  const goBack = useCallback(() => {
    if (step <= 0) {
      setStep(-1);
      return;
    }
    setDirection('back');
    setAnswers((a) => a.slice(0, -1));
    setStep((s) => s - 1);
  }, [step]);

  const retake = useCallback(() => {
    setAnswers([]);
    setResult(null);
    setStep(-1);
    setDirection('forward');
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const profile = result ? PROFILES[result] : null;

  const shareText = profile
    ? `I'm "${profile.title}" on TradeClaw! Discover your trading personality:`
    : '';

  const shareUrl = 'https://github.com/naimkatiman/tradeclaw';

  // Intro screen
  if (step === -1) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="max-w-lg w-full text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <BarChart3 className="w-10 h-10 text-emerald-400" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What kind of trader are you?
            </h1>
            <p className="text-[var(--text-secondary)] text-lg">
              5 quick questions. Personalized TradeClaw setup. Takes 30 seconds.
            </p>
          </div>
          <button
            onClick={() => {
              setDirection('forward');
              setStep(0);
            }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-400 transition-all duration-300 active:scale-[0.97]"
          >
            Start Quiz
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-xs text-zinc-500">No sign-up required</p>
        </div>
      </div>
    );
  }

  // Results screen
  if (step >= QUESTIONS.length && profile) {
    const Icon = profile.icon;
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-24">
        <div className="max-w-xl w-full space-y-8">
          {/* Profile card */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 space-y-6">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center ${profile.color}`}>
                <Icon className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                  Your result
                </p>
                <h2 className="text-2xl font-bold">{profile.title}</h2>
                <p className="text-sm text-[var(--text-secondary)]">{profile.subtitle}</p>
              </div>
            </div>

            <p className="text-sm text-zinc-400 leading-relaxed">{profile.description}</p>

            {/* Recommended config */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">
                Recommended TradeClaw Setup
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <ConfigCard label="Pairs to Watch" values={profile.pairs} />
                <ConfigCard label="Timeframes" values={profile.timeframes} />
                <ConfigCard label="Min Confidence" values={[profile.confidenceThreshold]} />
                <ConfigCard label="Signal Types" values={profile.signalTypes} />
              </div>
            </div>
          </div>

          {/* Star CTA */}
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full py-4 rounded-xl bg-white/90 text-black font-semibold text-sm hover:bg-white transition-all duration-300 active:scale-[0.98]"
          >
            <Star className="w-5 h-5" />
            Star TradeClaw on GitHub
          </a>

          {/* Share buttons */}
          <div className="flex gap-3">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on X
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/[0.02] text-sm font-medium text-zinc-300 hover:bg-white/5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share on LinkedIn
            </a>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button
              onClick={retake}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Question screen
  const q = QUESTIONS[step];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-24">
      <div className="max-w-lg w-full space-y-8">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              Question {step + 1} of {QUESTIONS.length}
            </span>
            <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div
          key={q.id}
          className={`space-y-6 animate-slide-${direction === 'forward' ? 'left' : 'right'}`}
        >
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-semibold">
              {q.subtitle}
            </p>
            <h2 className="text-2xl font-bold">{q.title}</h2>
          </div>

          <div className="space-y-3">
            {q.options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.label}
                  onClick={() => handleAnswer(opt.value)}
                  className="group w-full flex items-center gap-4 px-5 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200 text-left active:scale-[0.98]"
                >
                  <Icon className="w-5 h-5 text-zinc-500 group-hover:text-emerald-400 transition-colors shrink-0" />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                    {opt.label}
                  </span>
                  <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-emerald-400 ml-auto opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Back button */}
        <button
          onClick={goBack}
          className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ConfigCard({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3 space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium"
          >
            <CheckCircle2 className="w-3 h-3" />
            {v}
          </span>
        ))}
      </div>
    </div>
  );
}
