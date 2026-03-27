'use client';

import { useState, useEffect } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GITHUB_URL = 'https://github.com/naimkatiman/tradeclaw';
const DEMO_URL = 'https://tradeclaw.win';

const HN_SUBMIT_URL =
  `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(GITHUB_URL)}&t=${encodeURIComponent('Show HN: TradeClaw – Open-source AI trading signal platform (self-hosted)')}`;

const HN_TITLES: Array<{ id: string; text: string }> = [
  {
    id: 'title-1',
    text: 'Show HN: TradeClaw – Open-source AI trading signal platform (self-hosted)',
  },
  {
    id: 'title-2',
    text: "Show HN: I built an open-source alternative to TradingView signals that you can self-host",
  },
  {
    id: 'title-3',
    text: 'Show HN: TradeClaw – Free, self-hosted trading signals with RSI/MACD/EMA (MIT license)',
  },
];

const HN_BODY = `Hi HN!

I built TradeClaw — an open-source, self-hostable AI trading signal platform. After paying for several trading dashboards that were either locked behind paywalls or phoning home to the cloud, I decided to build something better.

**What it does:**
TradeClaw generates BUY/SELL/HOLD signals for 12+ forex, crypto, and commodities symbols using RSI, MACD, EMA, Bollinger Bands, and ATR. Signals are ranked by confidence score and explained in plain English by an AI layer. You can backtest strategies, set price alerts, and push notifications to Telegram.

**What makes it different:**
- Fully self-hosted — your data never leaves your server
- MIT licensed — fork it, white-label it, do what you want
- One Docker command to run locally: \`docker compose up\`
- No paywall, no "Pro tier", no usage limits
- Open API (OpenAPI 3.0) so you can wire it into your own bots

**Tech stack:**
Next.js 15, TypeScript, Tailwind CSS, Docker Compose. No heavyweight ML dependencies — signals are computed with standard TA formulas.

**Live demo:** ${DEMO_URL}
**GitHub:** ${GITHUB_URL}

**Current features:**
- Real-time signal screener for 12 symbols
- Multi-timeframe analysis (1m, 5m, 15m, 1h, 4h, 1d)
- AI signal explanation (plain-English rationale)
- Backtesting engine with equity curve
- Paper trading simulator
- Price alerts via Telegram bot
- Performance & correlation heatmaps
- Strategy builder

I would love feedback on: (1) signal quality / indicator choices, (2) the Docker deployment experience, and (3) what assets / features matter most to you.

Happy to answer any questions!`;

const FIRST_COMMENT = `Hey, creator here. Happy to answer any questions.

**A bit of context on why I built this:**
I kept paying $X/month for platforms that were either cloud-locked or opaque about how their signals were generated. I wanted something I could run on a $5 VPS, audit the source, and extend freely — so I built TradeClaw.

**Live demo (no sign-up):** ${DEMO_URL}

**Three things I'd love feedback on:**
1. Are the default indicators (RSI/MACD/EMA) the right starting set, or should I prioritise something else?
2. How is the Docker one-liner experience? I want self-hosting to be genuinely frictionless.
3. What asset classes are you most interested in — more crypto pairs, more forex, commodities?

Ask me anything — happy to go deep on the architecture, the signal logic, or how I'm thinking about the roadmap.`;

const TIPS = [
  {
    icon: '🕗',
    title: 'Post on weekday mornings (8–10am ET)',
    body: "HN traffic peaks on US East Coast mornings on weekdays. Avoid weekends and late Friday — posts die fast. Tuesday and Wednesday mornings tend to perform best.",
  },
  {
    icon: '📢',
    title: 'Show HN vs Ask HN',
    body: 'Use "Show HN" when you have something to demo — a live URL, GitHub repo, or working product. Use "Ask HN" when you have a genuine question. TradeClaw has both a live demo and a repo, so "Show HN" is correct.',
  },
  {
    icon: '💬',
    title: 'Post your first comment immediately',
    body: "As soon as the submission goes live, post a detailed comment (use the template below). This gives people something to respond to and signals you're engaged. It's also the HN norm for Show HN posts.",
  },
  {
    icon: '🤫',
    title: "Don't share the link before it gets traction",
    body: 'Resist the urge to blast the link on Twitter/Discord the moment you post. Let organic HN upvotes build first. Coordinated voting from external sources can get you flagged.',
  },
  {
    icon: '⚡',
    title: 'Engage every comment in the first hour',
    body: 'The algorithm rewards post velocity. Reply thoughtfully to every single comment in the first 60 minutes. Not just "thanks!" — add substance, answer questions, acknowledge criticism.',
  },
  {
    icon: '🙋',
    title: 'Use "I" language, not "we"',
    body: '"I built TradeClaw" feels authentic. "We built" sounds like marketing. HN values individual builders. If you have co-founders, you can mention them after the initial hook.',
  },
];

const KARMA_TIPS = [
  'Comment on active threads about algo trading or self-hosted tools before your submission day. Genuine, insightful comments build karma and visibility.',
  'Find an "Ask HN: best open source trading tools" or "who is hiring" thread and leave a thoughtful reply — HN readers will notice your profile.',
  'Upvote and engage on other Show HN posts in similar domains. Reciprocity is real on HN.',
  'If your karma is below 200, consider spending a week commenting before your big Show HN.',
  'Your account must be at least a few days old to submit Show HN posts that gain traction.',
];

const RELATED_SEARCHES = [
  { query: 'Show HN: self-hosted trading', description: 'Find previous self-hosted trading tools that got traction' },
  { query: 'Ask HN: best open source trading tools', description: 'Community discussions on OSS trading platforms' },
  { query: 'algorithmic trading open source', description: 'General algo trading OSS posts' },
  { query: 'self-hosted financial tools', description: 'Broader self-hosting finance discussions' },
  { query: 'trading signals python', description: 'Dev-focused signal generation threads' },
  { query: 'TradingView alternative', description: 'Posts from people looking for TV replacements' },
];

const CHECKLIST_ITEMS = [
  { id: 'demo', label: 'Live demo at tradeclaw.win is up and working' },
  { id: 'readme-gif', label: 'README has demo GIF or screenshot above the fold' },
  { id: 'docker', label: 'Docker one-liner tested on a fresh machine' },
  { id: 'supporters', label: '2–3 people ready to upvote and comment in the first 5 min' },
  { id: 'first-comment', label: 'First comment prepared and ready to paste' },
  { id: 'objections', label: 'Response templates ready for common objections' },
  { id: 'timing', label: 'Scheduled for weekday 8–10am ET' },
];

const STORAGE_KEY = 'hn-checklist-v1';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-200 ${
        copied
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : 'bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-zinc-200'
      }`}
    >
      {copied ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function OpenHNButton({ title }: { title: string }) {
  const url = `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(GITHUB_URL)}&t=${encodeURIComponent(title)}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-[#ff6600]/10 text-[#ff8533] border border-[#ff6600]/20 hover:bg-[#ff6600]/20 hover:text-[#ff9944] transition-all duration-200"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
      Open in HN
    </a>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function HNClient() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  // Persist checklist to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setChecked(JSON.parse(stored) as Record<string, boolean>);
    } catch {
      // ignore
    }
  }, []);

  const toggleCheck = (id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const checkedCount = CHECKLIST_ITEMS.filter(i => checked[i.id]).length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-3xl mx-auto px-4 pt-24 pb-20 space-y-12">

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ff6600]/10 border border-[#ff6600]/20 text-[#ff8533] text-xs font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.782 1.4 8.168L12 18.897l-7.334 3.863 1.4-8.168L.132 9.21l8.2-1.192z" />
            </svg>
            HN Launch Kit
          </div>

          <h1 className="text-4xl font-bold tracking-tight">
            Launch TradeClaw on{' '}
            <span style={{ color: '#ff6600' }}>Hacker News</span>
          </h1>

          <p className="text-[var(--text-secondary)] text-lg max-w-xl mx-auto leading-relaxed">
            Hacker News is the highest-ROI distribution channel for open-source dev tools.
            A successful Show HN can drive{' '}
            <span className="text-[var(--foreground)] font-medium">thousands of GitHub stars</span>,
            real contributors, and press coverage — all organic.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-2">
            {[
              { stat: '#1', label: 'OSS discovery channel' },
              { stat: '50k+', label: 'daily dev readers' },
              { stat: '0', label: 'cost to post' },
            ].map(item => (
              <div key={item.label} className="glass-card rounded-xl p-4">
                <div className="text-2xl font-bold" style={{ color: '#ff6600' }}>{item.stat}</div>
                <div className="text-xs text-[var(--text-secondary)] mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Title generator ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>①</span>
            Show HN Title — pick one
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Titles must start with "Show HN:". Keep it under 80 characters. Be specific about the key differentiator (self-hosted, MIT, open-source).
          </p>

          <div className="space-y-3">
            {HN_TITLES.map((t, i) => (
              <div
                key={t.id}
                className="glass-card rounded-xl p-4 flex items-start justify-between gap-4 group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold mt-0.5 shrink-0" style={{ color: '#ff6600' }}>
                    #{i + 1}
                  </span>
                  <p className="text-sm font-medium leading-relaxed">{t.text}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CopyButton text={t.text} />
                  <OpenHNButton title={t.text} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Body text ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>②</span>
            Show HN Body Text
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Paste this into the "text" field when submitting. ~300 words. Cover what it is, why you built it, what&apos;s different, and what feedback you want.
          </p>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs text-zinc-500 font-mono">hn-post-body.txt</span>
              <CopyButton text={HN_BODY} label="Copy body" />
            </div>
            <pre className="p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
              {HN_BODY}
            </pre>
          </div>
        </section>

        {/* ── Submission tips ─────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>③</span>
            HN Submission Tips
          </h2>

          <div className="space-y-3">
            {TIPS.map(tip => (
              <div key={tip.title} className="glass-card rounded-xl p-4 flex gap-4">
                <span className="text-2xl shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold mb-1">{tip.title}</p>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tip.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── First comment ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>④</span>
            First Comment Template
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Post this as your very first comment immediately after the submission goes live. It gives readers something to engage with and shows you&apos;re present.
          </p>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-xs text-zinc-500 font-mono">first-comment.txt</span>
              <CopyButton text={FIRST_COMMENT} label="Copy comment" />
            </div>
            <pre className="p-4 text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto">
              {FIRST_COMMENT}
            </pre>
          </div>
        </section>

        {/* ── Karma tips ──────────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>⑤</span>
            Build HN Karma First
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Low-karma accounts rarely make the front page. Spend a few days building genuine karma before your Show HN day.
          </p>

          <div className="space-y-2">
            {KARMA_TIPS.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 glass-card rounded-xl px-4 py-3">
                <span className="text-xs font-bold mt-0.5 shrink-0 w-5 text-center" style={{ color: '#ff6600' }}>
                  {i + 1}
                </span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Related HN searches ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>⑥</span>
            Related HN Threads — Search These
          </h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Read these threads before you post. Comment in the active ones. Learn what the community wants before your launch day.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {RELATED_SEARCHES.map(item => (
              <a
                key={item.query}
                href={`https://hn.algolia.com/?q=${encodeURIComponent(item.query)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-card rounded-xl p-4 group hover:border-[#ff6600]/30 transition-colors duration-200 block"
              >
                <p className="text-sm font-mono font-medium text-[#ff8533] group-hover:text-[#ff9944] mb-1">
                  &ldquo;{item.query}&rdquo;
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{item.description}</p>
                <p className="text-[10px] text-zinc-600 mt-2">Search HN via Algolia →</p>
              </a>
            ))}
          </div>
        </section>

        {/* ── Checklist ───────────────────────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span style={{ color: '#ff6600' }}>⑦</span>
              Pre-Launch Checklist
            </h2>
            <span className="text-sm font-semibold" style={{ color: checkedCount === CHECKLIST_ITEMS.length ? '#10b981' : '#ff8533' }}>
              {checkedCount}/{CHECKLIST_ITEMS.length} done
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%`,
                background: checkedCount === CHECKLIST_ITEMS.length ? '#10b981' : '#ff6600',
              }}
            />
          </div>

          <div className="space-y-2">
            {CHECKLIST_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={`w-full flex items-center gap-3 glass-card rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                  checked[item.id] ? 'opacity-70' : 'hover:border-white/20'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded shrink-0 flex items-center justify-center border-2 transition-all duration-200 ${
                    checked[item.id]
                      ? 'border-[#ff6600] bg-[#ff6600]'
                      : 'border-white/20'
                  }`}
                >
                  {checked[item.id] && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${checked[item.id] ? 'line-through text-[var(--text-secondary)]' : ''}`}>
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ── Submit button ───────────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span style={{ color: '#ff6600' }}>⑧</span>
            Ready? Launch It.
          </h2>

          <div className="glass-card rounded-xl p-6 flex flex-col sm:flex-row items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Submit to Hacker News</p>
              <p className="text-xs text-[var(--text-secondary)]">
                Opens the HN submission form with title and URL pre-filled. You&apos;ll still need to add the body text manually.
              </p>
            </div>
            <a
              href={HN_SUBMIT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
              style={{ background: '#ff6600' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.782 1.4 8.168L12 18.897l-7.334 3.863 1.4-8.168L.132 9.21l8.2-1.192z" />
              </svg>
              Submit to HN
            </a>
          </div>
        </section>

      </div>
    </div>
  );
}
