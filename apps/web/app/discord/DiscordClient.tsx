'use client';

import Link from 'next/link';
import { useState } from 'react';

const COMMANDS = [
  { cmd: '/signal [pair]', desc: 'Get the latest trading signal for any pair' },
  { cmd: '/leaderboard [period]', desc: 'Top 5 pairs by win rate' },
  { cmd: '/health', desc: 'Check API health and uptime' },
  { cmd: '/subscribe [pair] [min_confidence]', desc: 'Auto-receive signals in a channel' },
  { cmd: '/unsubscribe', desc: 'Stop signal broadcasts' },
  { cmd: '/help', desc: 'List all commands' },
];

const STEPS = [
  {
    num: '1',
    title: 'Invite the Bot',
    desc: 'Click the button above to add TradeClaw to your Discord server with the right permissions.',
  },
  {
    num: '2',
    title: 'Set Your Token',
    desc: 'Create a bot at discord.com/developers, copy the token, and set it as an environment variable.',
    code: 'export DISCORD_TOKEN=your_token_here',
  },
  {
    num: '3',
    title: 'Run the Bot',
    desc: 'Start the bot with a single command. It registers slash commands automatically.',
    code: 'cd packages/tradeclaw-discord && npm install && npm start',
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

export function DiscordClient() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Hero */}
      <section className="relative pt-32 pb-20 px-4 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 via-transparent to-transparent" />
        <div className="relative max-w-3xl mx-auto">
          {/* Discord Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#5865F2]/10 border border-[#5865F2]/20 mb-8">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="#5865F2">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Add TradeClaw to Your{' '}
            <span className="text-[#5865F2]">Discord</span> Server
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-xl mx-auto mb-8">
            Get real-time trading signals, leaderboards, and health checks — all from Discord slash commands. Free and open source.
          </p>

          <a
            href="https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&scope=bot+applications.commands&permissions=2048"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#5865F2]/25"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Add to Discord
          </a>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              ),
              title: 'Real-Time Signals',
              desc: 'BUY/SELL signals with confidence scores, TP/SL levels, and indicator data — delivered to your Discord channel.',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              ),
              title: '6 Slash Commands',
              desc: '/signal, /leaderboard, /health, /subscribe, /unsubscribe, /help — everything you need at your fingertips.',
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              ),
              title: 'Free & Open Source',
              desc: 'Self-host it, customize it, extend it. MIT licensed — no subscriptions, no API limits.',
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 hover:border-[#5865F2]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#5865F2]/10 flex items-center justify-center text-[#5865F2] mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Commands Table */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Slash Commands</h2>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {COMMANDS.map((c, i) => (
            <div
              key={c.cmd}
              className={`flex items-start gap-4 px-6 py-4 ${
                i < COMMANDS.length - 1 ? 'border-b border-[var(--border)]' : ''
              }`}
            >
              <code className="text-sm font-mono text-[#5865F2] whitespace-nowrap shrink-0">{c.cmd}</code>
              <span className="text-sm text-[var(--text-secondary)]">{c.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Signal Embed Preview */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Signal Preview</h2>
        <div className="max-w-md mx-auto rounded-xl border-l-4 border-l-emerald-500 bg-[#2b2d31] p-5 shadow-xl">
          <div className="font-semibold text-white mb-1">
            <span className="text-emerald-400">BUY</span> Signal — BTCUSD H1
          </div>
          <div className="text-zinc-500 text-xs mb-3">{'━'.repeat(24)}</div>
          <div className="grid grid-cols-3 gap-y-2 text-sm">
            <div><span className="text-zinc-400">Price</span><br /><span className="text-white">$43,250.00</span></div>
            <div><span className="text-zinc-400">TP</span><br /><span className="text-emerald-400">$44,100</span></div>
            <div><span className="text-zinc-400">SL</span><br /><span className="text-red-400">$42,800</span></div>
            <div><span className="text-zinc-400">Confidence</span><br /><span className="text-white">87%</span></div>
            <div><span className="text-zinc-400">RSI</span><br /><span className="text-white">42.3</span></div>
            <div><span className="text-zinc-400">MACD</span><br /><span className="text-emerald-400">{'\u25B2'}</span></div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 text-xs text-zinc-500">
            TradeClaw · Live signal · Just now
          </div>
        </div>
      </section>

      {/* Setup Steps */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Setup in 3 Steps</h2>
        <div className="space-y-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="w-8 h-8 rounded-full bg-[#5865F2]/10 text-[#5865F2] font-bold text-sm flex items-center justify-center">
                  {step.num}
                </span>
                <h3 className="font-semibold">{step.title}</h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)] ml-11 mb-3">{step.desc}</p>
              {step.code && (
                <div className="relative ml-11">
                  <pre className="bg-black/40 rounded-lg px-4 py-3 text-sm font-mono text-emerald-400 overflow-x-auto">
                    {step.code}
                  </pre>
                  <CopyButton text={step.code} />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Docker Compose */}
      <section className="max-w-3xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Self-Host with Docker</h2>
        <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="px-4 py-2 border-b border-[var(--border)] text-xs text-zinc-500 font-mono">
            docker-compose.yml
          </div>
          <pre className="p-4 text-sm font-mono text-zinc-300 overflow-x-auto">{`tradeclaw-discord:
  build: ./packages/tradeclaw-discord
  environment:
    - DISCORD_TOKEN=\${DISCORD_TOKEN}
    - TRADECLAW_BASE_URL=http://web:3000
  restart: unless-stopped
  depends_on:
    - web`}</pre>
          <CopyButton text={`tradeclaw-discord:\n  build: ./packages/tradeclaw-discord\n  environment:\n    - DISCORD_TOKEN=\${DISCORD_TOKEN}\n    - TRADECLAW_BASE_URL=http://web:3000\n  restart: unless-stopped\n  depends_on:\n    - web`} />
        </div>
      </section>

      {/* Source Link */}
      <section className="max-w-3xl mx-auto px-4 pb-32 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8">
          <p className="text-[var(--text-secondary)] mb-4">
            View the source code, report issues, or contribute improvements.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw/tree/main/packages/tradeclaw-discord"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-[var(--border)] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View on GitHub
          </a>
        </div>
      </section>
    </main>
  );
}
