import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Embedding',
  description: 'Embed TradeClaw signal widgets on any website — iframe, script tag, and React wrapper examples with dark/light theme support.',
};

export default function EmbeddingPage() {
  const { prev, next } = getPrevNext('/docs/embedding');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Integrations</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Embedding</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          Embed live signal widgets on any website with a single line of HTML.
          Widgets refresh every 60 seconds, support dark and light themes, and
          require no API key for public pairs.
        </p>
      </div>

      {/* Widget preview info */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Widget Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Default size', value: '320 × 420 px' },
            { label: 'Refresh rate', value: 'Every 60s' },
            { label: 'Themes', value: 'dark · light' },
            { label: 'Auth required', value: 'None (public)' },
          ].map(stat => (
            <div key={stat.label} className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center">
              <p className="text-lg font-bold font-mono text-emerald-400">{stat.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
        <p className="text-zinc-400 leading-relaxed">
          Each widget displays the current signal direction, confidence score, entry price,
          TP1/TP2/TP3, and stop loss for a single trading pair. Click-through links to the
          full TradeClaw dashboard can be toggled via the <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">data-link</code> attribute.
        </p>
      </section>

      {/* Supported pairs */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Supported Pairs</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {['XAUUSD', 'XAGUSD', 'USOIL', 'BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'GBPJPY'].map(pair => (
            <div key={pair} className="p-2.5 rounded-lg border border-white/5 bg-white/[0.02] text-center">
              <p className="text-sm font-mono font-medium text-zinc-200">{pair}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Iframe embed */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">iframe Embed</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          The simplest integration. Drop an <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">&lt;iframe&gt;</code> pointing
          to <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">/embed/[pair]</code> anywhere in your HTML.
        </p>
        <CodeBlock
          language="html"
          filename="Basic iframe"
          code={`<!-- Dark theme (default), 320×420 -->
<iframe
  src="https://your-instance.com/embed/XAUUSD"
  width="320"
  height="420"
  style="border: none; border-radius: 12px;"
  title="XAUUSD Signal Widget"
></iframe>`}
        />
        <CodeBlock
          language="html"
          filename="Light theme, custom size"
          code={`<iframe
  src="https://your-instance.com/embed/BTCUSD?theme=light&width=360&height=480"
  width="360"
  height="480"
  style="border: none; border-radius: 12px;"
  title="BTCUSD Signal Widget"
></iframe>`}
        />
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-zinc-300 mb-2">URL Parameters</p>
          <div className="space-y-1.5">
            {[
              { param: 'theme', desc: 'dark (default) or light' },
              { param: 'width', desc: 'Widget width in px (default: 320, min: 240, max: 600)' },
              { param: 'height', desc: 'Widget height in px (default: 420, min: 320, max: 800)' },
              { param: 'link', desc: 'Set to 0 to disable click-through links' },
            ].map(p => (
              <div key={p.param} className="flex gap-3">
                <code className="text-xs font-mono text-emerald-400 w-16 shrink-0">{p.param}</code>
                <p className="text-xs text-zinc-500">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Script tag */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Script Tag Embed</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          The script tag approach renders the widget inline without creating an iframe.
          It injects a shadow DOM so TradeClaw styles do not leak into your page.
          Configure via <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">data-*</code> attributes on the container element.
        </p>
        <CodeBlock
          language="html"
          filename="Script tag embed"
          code={`<!-- Place the container div where you want the widget -->
<div
  id="tradeclaw-widget"
  data-pair="XAUUSD"
  data-theme="dark"
  data-width="320"
  data-height="420"
></div>

<!-- Add the loader script once, anywhere in your page -->
<script
  src="https://your-instance.com/api/embed"
  async
  defer
></script>`}
        />
        <CodeBlock
          language="html"
          filename="Multiple widgets on one page"
          code={`<div class="widget-grid">
  <div data-tradeclaw data-pair="XAUUSD" data-theme="dark"></div>
  <div data-tradeclaw data-pair="BTCUSD" data-theme="dark"></div>
  <div data-tradeclaw data-pair="EURUSD" data-theme="dark"></div>
</div>

<script src="https://your-instance.com/api/embed" async defer></script>`}
        />
      </section>

      {/* Themes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Themes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-xl border border-white/5 bg-zinc-900">
            <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3 font-medium">Dark Theme</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Background</span>
                <span className="font-mono text-zinc-300">#18181b</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Border</span>
                <span className="font-mono text-zinc-300">white/6</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Accent</span>
                <span className="font-mono text-emerald-400">#10b981</span>
              </div>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-zinc-200 bg-white">
            <p className="text-xs text-zinc-400 uppercase tracking-wide mb-3 font-medium">Light Theme</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Background</span>
                <span className="font-mono text-zinc-700">#ffffff</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Border</span>
                <span className="font-mono text-zinc-700">zinc-200</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Accent</span>
                <span className="font-mono text-emerald-600">#059669</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* React wrapper */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">React Component Wrapper</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          For React applications, wrap the iframe in a typed component so you get
          IntelliSense on the props and a consistent rendering pattern.
        </p>
        <CodeBlock
          language="tsx"
          filename="TradeclawWidget.tsx"
          code={`interface TradeclawWidgetProps {
  pair: string;
  theme?: 'dark' | 'light';
  width?: number;
  height?: number;
  baseUrl?: string;
}

export function TradeclawWidget({
  pair,
  theme = 'dark',
  width = 320,
  height = 420,
  baseUrl = 'https://your-instance.com',
}: TradeclawWidgetProps) {
  const src = \`\${baseUrl}/embed/\${pair}?theme=\${theme}&width=\${width}&height=\${height}\`;

  return (
    <iframe
      src={src}
      width={width}
      height={height}
      style={{ border: 'none', borderRadius: 12 }}
      title={\`\${pair} Signal Widget\`}
      loading="lazy"
    />
  );
}

// Usage
<TradeclawWidget pair="XAUUSD" theme="dark" width={320} height={420} />`}
        />
      </section>

      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/embedding/page.tsx" />
    </article>
  );
}
