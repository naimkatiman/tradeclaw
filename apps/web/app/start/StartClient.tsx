'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  GitBranch,
  Settings,
  Play,
  BarChart2,
  Share2,
  CheckCircle,
  Circle,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Star,
  ExternalLink,
  Terminal,
  Clock,
  Rocket,
} from 'lucide-react';

const STORAGE_KEY = 'tc-start-progress';

interface StepProgress {
  currentStep: number;
  completedSteps: number[];
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  );
}

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  return (
    <div className="relative rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden mt-3">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-mono">{language}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

function TabCodeBlock({ tabs }: { tabs: { label: string; code: string; language?: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-700 overflow-hidden mt-3">
      <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-800">
        <div className="flex">
          {tabs.map((tab, i) => (
            <button
              key={tab.label}
              onClick={() => setActive(i)}
              className={`px-4 py-2 text-xs font-medium transition-colors ${
                active === i
                  ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-900/50'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="pr-3">
          <CopyButton text={tabs[active].code} />
        </div>
      </div>
      <pre className="p-4 text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {tabs[active].code}
      </pre>
    </div>
  );
}

function Step1() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-300">
        Clone the TradeClaw repository from GitHub to get started. No npm install needed yet — just clone and enter the directory.
      </p>
      <CodeBlock
        code={`git clone https://github.com/naimkatiman/tradeclaw\ncd tradeclaw`}
      />
      <div className="flex items-start gap-3 mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-300">You should see:</p>
          <p className="text-sm text-zinc-400 mt-1">
            A <code className="text-emerald-300">tradeclaw/</code> folder with{' '}
            <code className="text-emerald-300">apps/</code>,{' '}
            <code className="text-emerald-300">packages/</code>, and{' '}
            <code className="text-emerald-300">docker-compose.yml</code>
          </p>
        </div>
      </div>
      <a
        href="https://github.com/naimkatiman/tradeclaw"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-emerald-400 transition-colors mt-2"
      >
        <ExternalLink className="w-4 h-4" />
        View on GitHub
      </a>
    </div>
  );
}

function Step2() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-300">
        Copy the environment template and configure your optional settings. Most defaults work out of the box — only Telegram token is needed for notifications.
      </p>
      <CodeBlock code={`cp apps/web/.env.example apps/web/.env`} />
      <div className="mt-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
        <p className="text-sm font-medium text-zinc-300 mb-3">Optional: Add Telegram notifications</p>
        <CodeBlock
          code={`# In apps/web/.env\nTELEGRAM_BOT_TOKEN=your_bot_token_here\nTELEGRAM_WEBHOOK_URL=https://your-domain.com/api/telegram/webhook`}
        />
        <p className="text-xs text-zinc-500 mt-2">
          Get a bot token from{' '}
          <a
            href="https://t.me/BotFather"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            @BotFather
          </a>{' '}
          on Telegram. Skip this step to run without notifications.
        </p>
      </div>
      <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700">
        <Settings className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-400">
          No API keys required for core functionality. Live prices use Binance and Yahoo Finance public endpoints with a synthetic fallback.
        </p>
      </div>
    </div>
  );
}

function Step3() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-300">
        Choose your preferred way to run TradeClaw locally. Docker Compose is the recommended one-command approach.
      </p>
      <TabCodeBlock
        tabs={[
          {
            label: '🐳 Docker (recommended)',
            code: `docker compose up -d\n\n# Verify it's running\ncurl http://localhost:3000/api/health`,
          },
          {
            label: '⚡ npm dev',
            code: `npm install\nnpm run dev --workspace=apps/web\n\n# App runs at http://localhost:3000`,
          },
          {
            label: '🚀 npx demo',
            code: `npx tradeclaw-demo\n\n# Spins up a live demo in ~10 seconds\n# No install required`,
          },
        ]}
      />
      <div className="flex items-start gap-3 mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Terminal className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Health check response:</p>
          <pre className="text-xs font-mono text-zinc-400 mt-1 whitespace-pre-wrap">
            {`{"status":"ok","version":"0.4.0","uptime":42}`}
          </pre>
        </div>
      </div>
      <p className="text-xs text-zinc-500">
        Requires: Node.js v18+ or Docker Desktop. Port 3000 must be free.
      </p>
    </div>
  );
}

function Step4() {
  return (
    <div className="space-y-4">
      <p className="text-zinc-300">
        Your TradeClaw instance is live! Here&apos;s what to explore first:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        {[
          {
            href: '/dashboard',
            label: 'Live Dashboard',
            desc: 'Real-time BUY/SELL signals across 10+ assets',
            color: 'emerald',
          },
          {
            href: '/api/signals',
            label: 'REST API',
            desc: 'JSON endpoint: /api/signals — copy into any script',
            color: 'blue',
          },
          {
            href: '/backtest',
            label: 'Backtest',
            desc: 'Run strategies on historical data with charts',
            color: 'purple',
          },
          {
            href: '/screener',
            label: 'Screener',
            desc: 'Scan all assets for RSI/MACD/EMA setups',
            color: 'amber',
          },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col gap-1 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 hover:border-emerald-500/50 transition-colors"
          >
            <span className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
              {item.label}
            </span>
            <span className="text-xs text-zinc-400">{item.desc}</span>
          </Link>
        ))}
      </div>
      <CodeBlock
        code={`# Fetch live signals via API\ncurl http://localhost:3000/api/signals?pair=BTCUSD&timeframe=H1`}
      />
      <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700 mt-2">
        <BarChart2 className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-400">
          Signals update every 5 minutes. First run generates signals for all 10 asset pairs simultaneously using RSI, MACD, EMA, Bollinger Bands, and Stochastic indicators.
        </p>
      </div>
    </div>
  );
}

function Step5({ stars }: { stars: number }) {
  const [copiedTweet, setCopiedTweet] = useState(false);

  const tweet = `I just self-hosted @TradeClaw_win — live AI trading signals for BTC, ETH, XAU and more in 60 seconds 🚀\n\nFree & open-source ⭐ https://github.com/naimkatiman/tradeclaw`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;

  const redditPost = `I just set up TradeClaw — a free open-source AI trading signal platform. Live RSI/MACD/EMA signals for BTC, ETH, Gold, Forex. Self-hosted in 60 seconds with Docker. https://github.com/naimkatiman/tradeclaw`;
  const redditUrl = `https://www.reddit.com/r/algotrading/submit?title=TradeClaw%20-%20Free%20Open-Source%20AI%20Trading%20Signals&text=${encodeURIComponent(redditPost)}`;

  return (
    <div className="space-y-4">
      <p className="text-zinc-300">
        You&apos;re all set! Help TradeClaw reach 1000 ⭐ by sharing it with the community.
      </p>

      {/* GitHub Star CTA */}
      <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-medium text-emerald-300">Star on GitHub</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              {stars} / 1000 ⭐ — {Math.round((stars / 1000) * 100)}% to goal
            </p>
            <div className="w-48 h-1.5 bg-zinc-700 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min((stars / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-sm transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </div>
      </div>

      {/* Share kit */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-300">Share your setup</p>
        <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <p className="text-xs font-mono text-zinc-400 leading-relaxed whitespace-pre-wrap">{tweet}</p>
          <div className="flex gap-2 mt-3">
            <a
              href={tweetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1d9bf0] hover:bg-[#1a8cd8] text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Tweet this
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(tweet);
                setCopiedTweet(true);
                setTimeout(() => setCopiedTweet(false), 2000);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-medium transition-colors"
            >
              {copiedTweet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedTweet ? 'Copied!' : 'Copy'}
            </button>
            <a
              href={redditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Reddit
            </a>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-lg bg-zinc-800/30 border border-zinc-700">
        <Rocket className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-zinc-400">
          Explore the full feature set:{' '}
          <Link href="/dashboard" className="text-emerald-400 hover:underline">dashboard</Link>,{' '}
          <Link href="/plugins" className="text-emerald-400 hover:underline">plugins</Link>,{' '}
          <Link href="/backtest" className="text-emerald-400 hover:underline">backtest</Link>,{' '}
          <Link href="/api-docs" className="text-emerald-400 hover:underline">API docs</Link>, and{' '}
          <Link href="/docs" className="text-emerald-400 hover:underline">full documentation</Link>.
        </p>
      </div>
    </div>
  );
}

const STEPS_META = [
  { icon: GitBranch, title: 'Clone Repository', subtitle: 'Get the code from GitHub', estimatedTime: '~30s' },
  { icon: Settings, title: 'Configure', subtitle: 'Set up your .env file', estimatedTime: '~1 min' },
  { icon: Play, title: 'Run', subtitle: 'Start TradeClaw locally', estimatedTime: '~1–2 min' },
  { icon: BarChart2, title: 'See Signals', subtitle: 'Explore live trading signals', estimatedTime: '~2 min' },
  { icon: Share2, title: 'Share', subtitle: 'Help grow the community', estimatedTime: '~30s' },
];

export default function StartClient() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stars, setStars] = useState(4);
  const [isResuming, setIsResuming] = useState(false);

  // Load progress from localStorage
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const progress: StepProgress = JSON.parse(saved);
        if (progress.currentStep > 0 || progress.completedSteps.length > 0) {
          timer = setTimeout(() => setIsResuming(true), 0);
        }
      }
    } catch { /* ignore */ }
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Fetch stars
    fetch('/api/github-stars')
      .then((r) => r.json())
      .then((d) => { if (d.stars) setStars(d.stars); })
      .catch(() => {});
  }, []);

  const saveProgress = useCallback((step: number, completed: number[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ currentStep: step, completedSteps: completed }));
    } catch { /* ignore */ }
  }, []);

  const handleResume = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const progress: StepProgress = JSON.parse(saved);
        setCurrentStep(progress.currentStep);
        setCompletedSteps(progress.completedSteps);
      }
    } catch { /* ignore */ }
    setIsResuming(false);
  };

  const handleStartFresh = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setCompletedSteps([]);
    setIsResuming(false);
  };

  const goToStep = (step: number) => {
    // Mark current step as completed when moving forward
    if (step > currentStep) {
      const newCompleted = [...completedSteps];
      for (let i = currentStep; i < step; i++) {
        if (!newCompleted.includes(i)) newCompleted.push(i);
      }
      setCompletedSteps(newCompleted);
      saveProgress(step, newCompleted);
    } else {
      saveProgress(step, completedSteps);
    }
    setCurrentStep(step);
  };

  const stepComponents = [
    <Step1 key="s1" />,
    <Step2 key="s2" />,
    <Step3 key="s3" />,
    <Step4 key="s4" />,
    <Step5 key="s5" stars={stars} />,
  ];

  const current = STEPS_META[currentStep];
  const StepIcon = current.icon;
  const isLast = currentStep === STEPS_META.length - 1;
  const progressPct = ((currentStep + 1) / STEPS_META.length) * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 mb-4">
            <Rocket className="w-3.5 h-3.5" />
            Setup Guide
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Get Started with TradeClaw
          </h1>
          <p className="text-zinc-400 text-lg">
            Self-host your AI trading signal platform in under 5 minutes
          </p>
        </div>

        {/* Resume banner */}
        {isResuming && (
          <div className="mb-6 p-4 rounded-lg bg-zinc-800/80 border border-zinc-700 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">You were in the middle of setup</p>
              <p className="text-xs text-zinc-400">Continue where you left off?</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleResume}
                className="px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-medium transition-colors"
              >
                Resume
              </button>
              <button
                onClick={handleStartFresh}
                className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm transition-colors"
              >
                Start fresh
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6">
          {/* Left sidebar — checklist (desktop) */}
          <div className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-8 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Steps</p>
              <div className="space-y-1">
                {STEPS_META.map((step, i) => {
                  const isCompleted = completedSteps.includes(i);
                  const isCurrent = currentStep === i;
                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentStep(i)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                        isCurrent
                          ? 'bg-emerald-500/15 border border-emerald-500/30'
                          : 'hover:bg-zinc-800/50'
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className={`w-4 h-4 ${isCurrent ? 'text-emerald-400' : 'text-zinc-600'}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium truncate ${isCurrent ? 'text-emerald-300' : isCompleted ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {step.title}
                        </p>
                        <p className="text-[10px] text-zinc-600 flex items-center gap-1 mt-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {step.estimatedTime}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-500 mb-1.5">Overall progress</p>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">{currentStep + 1} of {STEPS_META.length}</p>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Mobile step indicator */}
            <div className="md:hidden mb-4 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-zinc-400">Step {currentStep + 1} of {STEPS_META.length}</p>
                <p className="text-xs text-zinc-500">{current.estimatedTime}</p>
              </div>
              <div className="flex gap-1">
                {STEPS_META.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      i <= currentStep ? 'bg-emerald-500' : 'bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Step card */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 overflow-hidden">
              {/* Step header */}
              <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <StepIcon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{current.title}</h2>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700 hidden sm:inline-flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {current.estimatedTime}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">{current.subtitle}</p>
                  </div>
                </div>
              </div>

              {/* Step content */}
              <div className="px-6 py-6">
                {stepComponents[currentStep]}
              </div>

              {/* Navigation */}
              <div className="px-6 py-4 border-t border-zinc-800 flex items-center justify-between gap-4">
                <button
                  onClick={() => goToStep(currentStep - 1)}
                  disabled={currentStep === 0}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <div className="flex items-center gap-1.5">
                  {STEPS_META.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentStep ? 'bg-emerald-400' : completedSteps.includes(i) ? 'bg-emerald-600' : 'bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                {isLast ? (
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
                  >
                    Open Dashboard
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <button
                    onClick={() => goToStep(currentStep + 1)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-sm font-semibold transition-colors"
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Bottom links */}
            <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm text-zinc-500">
              <Link href="/docs" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                Full documentation
              </Link>
              <Link href="/api-docs" className="hover:text-zinc-300 transition-colors flex items-center gap-1">
                <ExternalLink className="w-3.5 h-3.5" />
                API reference
              </Link>
              <a
                href="https://github.com/naimkatiman/tradeclaw/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-zinc-300 transition-colors flex items-center gap-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub Discussions
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
