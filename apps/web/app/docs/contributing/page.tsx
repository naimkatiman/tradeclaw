import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Contributing',
  description: 'Contribute to TradeClaw — monorepo architecture, dev setup, tech stack, code style, and PR process.',
};

export default function ContributingPage() {
  const { prev, next } = getPrevNext('/docs/contributing');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Project</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Contributing</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw is open source and welcomes contributions. Whether you are adding
          an indicator, improving the UI, or fixing a bug — this page covers everything
          you need to get from zero to a merged pull request.
        </p>
      </div>

      {/* Monorepo architecture */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Monorepo Architecture</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          TradeClaw uses a standard npm workspaces monorepo. The main application lives in
          <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs"> apps/web</code>.
          Shared packages (types, utilities) live under <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">packages/</code>.
        </p>
        <CodeBlock
          language="bash"
          filename="Repository structure"
          code={`tradeclaw/
├── apps/
│   └── web/                  # Next.js application (main app)
│       ├── app/              # App Router pages and API routes
│       │   ├── api/          # REST API handlers
│       │   ├── dashboard/    # Dashboard UI
│       │   ├── docs/         # This documentation site
│       │   └── lib/          # TA engine, stores, utilities
│       ├── components/       # Reusable React components
│       └── public/           # Static assets
├── packages/
│   └── types/                # Shared TypeScript types
├── docker-compose.yml        # Production compose file
├── docker-compose.dev.yml    # Dev compose with hot reload
└── STATE.yaml                # Project state tracker`}
        />
      </section>

      {/* Dev setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Dev Setup</h2>
        <div className="space-y-3 mb-5">
          {[
            { step: '1', title: 'Fork and clone', cmd: 'git clone https://github.com/your-fork/tradeclaw && cd tradeclaw' },
            { step: '2', title: 'Install dependencies', cmd: 'npm install' },
            { step: '3', title: 'Copy env template', cmd: 'cp apps/web/.env.example apps/web/.env.local' },
            { step: '4', title: 'Start dev server', cmd: 'npm run dev --workspace=apps/web' },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-400">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-1.5">{s.title}</p>
                <code className="text-xs font-mono text-zinc-400 bg-white/[0.03] border border-white/5 px-3 py-1.5 rounded block">{s.cmd}</code>
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm text-zinc-500">
          The dev server starts at <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">http://localhost:3000</code> with
          hot reload. No database setup is required — TradeClaw uses JSON file storage by default.
        </p>
      </section>

      {/* Tech stack */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Tech Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { tech: 'Next.js 14', role: 'Framework', desc: 'App Router, Server Components, Route Handlers' },
            { tech: 'TypeScript', role: 'Language', desc: 'Strict mode, no implicit any' },
            { tech: 'Tailwind CSS v4', role: 'Styling', desc: 'Utility classes, no CSS modules' },
            { tech: 'File-based storage', role: 'Data', desc: 'JSON files in /data — no database required' },
            { tech: 'Server-Sent Events', role: 'Real-time', desc: 'Live price stream via /api/prices/stream' },
            { tech: 'Node.js crypto', role: 'Security', desc: 'HMAC-SHA256 for webhook signing' },
          ].map(t => (
            <div key={t.tech} className="p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-sm font-semibold text-zinc-200">{t.tech}</p>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2 py-0.5 rounded">{t.role}</span>
              </div>
              <p className="text-xs text-zinc-500">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Directory structure */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Key Directories</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Path</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Purpose</th>
              </tr>
            </thead>
            <tbody>
              {[
                { path: 'apps/web/app/api/', desc: 'All REST API route handlers (Next.js Route Handlers)' },
                { path: 'apps/web/app/lib/ta-engine.ts', desc: 'Technical analysis — RSI, MACD, EMA, BB, Stochastic' },
                { path: 'apps/web/app/lib/signal-store.ts', desc: 'File-based signal persistence and query layer' },
                { path: 'apps/web/app/lib/hooks/', desc: 'React hooks (use-price-stream, use-signals, etc.)' },
                { path: 'apps/web/components/', desc: 'Shared React components (charts, cards, modals)' },
                { path: 'apps/web/app/docs/', desc: 'This documentation site — App Router pages' },
                { path: 'apps/web/public/sw.js', desc: 'Service Worker for PWA offline support' },
              ].map(row => (
                <tr key={row.path} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 text-sm font-mono text-emerald-400">{row.path}</td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Code style */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Code Style</h2>
        <div className="space-y-3">
          {[
            { rule: 'TypeScript strict mode', desc: 'All files must pass tsc --noEmit. No implicit any, no unused vars.' },
            { rule: 'Server Components by default', desc: 'Only add "use client" when you need browser APIs or React state.' },
            { rule: 'No external state libraries', desc: 'Use React state, context, and URL params. No Redux or Zustand.' },
            { rule: 'Tailwind over inline styles', desc: 'Use utility classes. Avoid style={{}} except for truly dynamic values.' },
            { rule: 'File-based storage API', desc: 'All data access goes through the store modules in app/lib/. No direct fs calls in routes.' },
          ].map(c => (
            <div key={c.rule} className="flex gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <span className="text-emerald-400 text-sm mt-0.5 shrink-0">›</span>
              <div>
                <p className="text-sm font-medium text-zinc-200">{c.rule}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Adding indicators */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Adding a New Indicator</h2>
        <CodeBlock
          language="typescript"
          filename="1. Add to apps/web/app/lib/ta-engine.ts"
          code={`// Export the result type
export interface MyIndicatorResult {
  value: number;
  signal: 'BUY' | 'SELL' | 'NEUTRAL';
}

// Export the calculation function
export function calcMyIndicator(closes: number[], period = 14): MyIndicatorResult {
  // … your implementation
  return { value, signal };
}

// 2. Import and call it in generateSignal()
// 3. Include its vote in the confluence score calculation`}
        />
      </section>

      {/* PR process */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Pull Request Process</h2>
        <div className="space-y-3">
          {[
            { n: '1', title: 'Open an issue first', desc: 'Describe what you want to build or fix. We will confirm the approach before you invest time writing code.' },
            { n: '2', title: 'Branch from main', desc: 'Use the pattern feat/description or fix/description. Keep branches focused — one feature or fix per PR.' },
            { n: '3', title: 'Run the build', desc: 'npm run build must pass clean with zero TypeScript errors before opening a PR.' },
            { n: '4', title: 'Write a clear description', desc: 'Summarize what changed and why. Include screenshots for UI changes. Link to the related issue.' },
            { n: '5', title: 'Update docs if needed', desc: 'New endpoints go in /docs/api. New indicators go in /docs/signals. New env vars go in /docs/configuration.' },
          ].map(s => (
            <div key={s.n} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-zinc-400">{s.n}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/contributing/page.tsx" />
    </article>
  );
}
