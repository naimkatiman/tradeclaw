import type { Metadata } from 'next';
import { CodeBlock } from '../components/code-block';
import { PageNav } from '../components/page-nav';
import { getPrevNext } from '../nav-config';

export const metadata: Metadata = {
  title: 'Telegram Bot',
  description: 'Connect TradeClaw to Telegram — BotFather setup, environment variables, command reference, and signal broadcasting.',
};

export default function TelegramPage() {
  const { prev, next } = getPrevNext('/docs/telegram');

  return (
    <article>
      <div className="mb-10">
        <p className="text-sm text-emerald-400 font-medium mb-2">Integrations</p>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-4">Telegram Bot</h1>
        <p className="text-lg text-zinc-400 leading-relaxed">
          TradeClaw ships with a production-ready Telegram bot. Subscribers receive formatted
          signal alerts the moment they are generated — with entry, TP levels, SL, and a
          confidence badge. Setup takes under five minutes.
        </p>
      </div>

      {/* BotFather setup */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">BotFather Setup</h2>
        <div className="space-y-3 mb-6">
          {[
            {
              step: '1',
              title: 'Create a bot',
              body: 'Open Telegram and message @BotFather. Send /newbot and follow the prompts to choose a name and username.',
            },
            {
              step: '2',
              title: 'Copy the token',
              body: 'BotFather will reply with a token like 110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw. Copy it — this is your TELEGRAM_BOT_TOKEN.',
            },
            {
              step: '3',
              title: 'Set the webhook URL',
              body: 'After deploying TradeClaw, point Telegram to your instance so it can receive updates.',
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-400">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
        <CodeBlock
          language="bash"
          filename="Register the webhook with Telegram"
          code={`curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \\
  -d "url=https://your-instance.com/api/telegram/webhook"`}
        />
      </section>

      {/* Env vars */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Environment Variables</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden mb-4">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Required</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'TELEGRAM_BOT_TOKEN', req: true, desc: 'Token from @BotFather. Format: 1234567890:ABC...' },
                { key: 'TELEGRAM_WEBHOOK_URL', req: true, desc: 'Full URL to your /api/telegram/webhook endpoint' },
                { key: 'TELEGRAM_ADMIN_CHAT_ID', req: false, desc: 'Chat ID that receives error notifications' },
              ].map(row => (
                <tr key={row.key} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 text-sm font-mono text-emerald-400">{row.key}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.req
                      ? <span className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded">Required</span>
                      : <span className="text-xs font-medium text-zinc-500 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded">Optional</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CodeBlock
          language="bash"
          filename=".env.local"
          code={`TELEGRAM_BOT_TOKEN=110201543:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw
TELEGRAM_WEBHOOK_URL=https://your-instance.com/api/telegram/webhook
TELEGRAM_ADMIN_CHAT_ID=123456789`}
        />
      </section>

      {/* Commands */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Bot Commands</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          The bot responds to the following commands. Send them in any private chat or group
          where the bot is a member.
        </p>
        <div className="space-y-2">
          {[
            { cmd: '/start', desc: 'Initialize the bot and display a welcome message with quick-start instructions.' },
            { cmd: '/subscribe', desc: 'Subscribe to signal alerts. You will receive a message for every new signal that meets your filter criteria.' },
            { cmd: '/unsubscribe', desc: 'Stop receiving signal alerts. Your filter settings are preserved.' },
            { cmd: '/signals', desc: 'Fetch the last 10 active signals and display them inline.' },
            { cmd: '/pairs', desc: 'List all supported trading pairs with their current direction and confidence.' },
            { cmd: '/settings', desc: 'View and update your subscriber filter (pairs, minimum confidence, direction).' },
            { cmd: '/help', desc: 'Show the full command reference and support link.' },
          ].map(c => (
            <div key={c.cmd} className="flex gap-4 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <code className="text-sm font-mono text-emerald-400 shrink-0 w-28">{c.cmd}</code>
              <p className="text-sm text-zinc-500">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subscriber filtering */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Subscriber Filtering</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          Each subscriber can configure filters so they only receive relevant alerts.
          Filters are set via <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">/settings</code> or
          by calling the API directly.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {[
            { label: 'Pair filter', desc: 'Receive alerts only for specific symbols (e.g. XAUUSD, BTCUSD). Defaults to all pairs.' },
            { label: 'Min confidence', desc: 'Only receive signals above a threshold (e.g. 75). Range 0–100. Defaults to 65.' },
            { label: 'Direction filter', desc: 'Only BUY, only SELL, or both. Defaults to both.' },
            { label: 'Timeframe filter', desc: 'Specific timeframes only (M15, H1, H4, D1). Defaults to all.' },
          ].map(f => (
            <div key={f.label} className="p-3 rounded-xl border border-white/5 bg-white/[0.02]">
              <p className="text-sm font-medium text-zinc-200 mb-1">{f.label}</p>
              <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* API endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">API Endpoints</h2>
        <div className="rounded-xl border border-white/6 overflow-hidden">
          {[
            { method: 'POST', path: '/api/telegram/webhook', desc: 'Telegram update receiver — set this as your bot webhook URL.' },
            { method: 'POST', path: '/api/telegram/send', desc: 'Send a message to a specific chat ID.', params: 'chatId, text, parseMode' },
            { method: 'GET', path: '/api/telegram/status', desc: 'Check bot connection and webhook registration status.' },
          ].map(ep => (
            <div key={ep.path} className="p-4 border-b border-white/4 last:border-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-blue-500/15 text-blue-400 border-blue-500/25'}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-zinc-200">{ep.path}</code>
              </div>
              <p className="text-sm text-zinc-500">{ep.desc}</p>
              {'params' in ep && ep.params && (
                <p className="text-xs text-zinc-600 mt-1 font-mono">{ep.params}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Broadcasting */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Signal Broadcasting</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          When a new signal is generated, TradeClaw calls an internal broadcaster that
          iterates all active subscribers, applies their filters, and sends a formatted
          message to matching chat IDs.
        </p>
        <CodeBlock
          language="typescript"
          filename="Broadcast format (MarkdownV2)"
          code={`// Example message sent to each subscriber
*🟢 BUY Signal — XAUUSD*

📊 Timeframe: H1
💪 Confidence: 87%
💰 Entry: 2345\\.50

🎯 TP1: 2360\\.00
🎯 TP2: 2374\\.50
🎯 TP3: 2389\\.00
🛑 SL:  2331\\.00

_Generated at 14:30 UTC_`}
        />
        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-zinc-300 mb-2">Rate Limit</p>
          <p className="text-sm text-zinc-500">
            The Telegram Bot API allows up to 30 messages per second. TradeClaw queues
            broadcasts and dispatches them within this limit. Channels with large subscriber
            counts batch sends automatically.
          </p>
        </div>
      </section>

<<<<<<< HEAD
=======
      {/* Channel Auto-Broadcast */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-white mb-4">Channel Auto-Broadcast</h2>
        <p className="text-zinc-400 mb-5 leading-relaxed">
          TradeClaw can automatically post the top 3 signals to a public or private Telegram
          channel every 4 hours. This is powered by a Vercel Cron job and requires two
          additional environment variables.
        </p>

        <div className="rounded-xl border border-white/6 overflow-hidden mb-6">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/6 bg-white/[0.02]">
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Variable</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Required</th>
                <th className="px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase tracking-wide">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                { key: 'TELEGRAM_CHANNEL_ID', req: true, desc: 'Channel username (@mychannel) or numeric ID (-100...)' },
                { key: 'CRON_SECRET', req: false, desc: 'Bearer token for cron auth — Vercel sets this automatically' },
              ].map(row => (
                <tr key={row.key} className="border-b border-white/4 last:border-0">
                  <td className="px-4 py-3 text-sm font-mono text-emerald-400">{row.key}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.req
                      ? <span className="text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/15 px-2 py-0.5 rounded">Required</span>
                      : <span className="text-xs font-medium text-zinc-500 bg-white/[0.03] border border-white/5 px-2 py-0.5 rounded">Optional</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-500">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 mb-6">
          {[
            {
              step: '1',
              title: 'Create a Telegram channel',
              body: 'Create a public or private channel. Add your bot as an administrator with permission to post messages.',
            },
            {
              step: '2',
              title: 'Get the channel ID',
              body: 'For public channels, use @yourchannel. For private channels, forward a message to @userinfobot to get the numeric ID (starts with -100).',
            },
            {
              step: '3',
              title: 'Set the environment variable',
              body: 'Add TELEGRAM_CHANNEL_ID to your .env file. The cron job will pick it up automatically.',
            },
          ].map(s => (
            <div key={s.step} className="flex gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-emerald-400">{s.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200 mb-1">{s.title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <CodeBlock
          language="bash"
          filename=".env.local"
          code={`TELEGRAM_CHANNEL_ID=@your_channel_name
# or for private channels:
# TELEGRAM_CHANNEL_ID=-1001234567890`}
        />

        <div className="mt-6 rounded-xl border border-white/6 overflow-hidden">
          {[
            { method: 'POST', path: '/api/telegram/broadcast', desc: 'Trigger an immediate broadcast of top 3 signals to the configured channel.' },
            { method: 'GET', path: '/api/telegram/broadcast', desc: 'Check broadcast status: last time, next scheduled time, total count.' },
            { method: 'GET', path: '/api/cron/telegram', desc: 'Vercel Cron endpoint — called every 4 hours automatically.' },
          ].map(ep => (
            <div key={ep.path + ep.method} className="p-4 border-b border-white/4 last:border-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${ep.method === 'GET' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' : 'bg-blue-500/15 text-blue-400 border-blue-500/25'}`}>
                  {ep.method}
                </span>
                <code className="text-sm font-mono text-zinc-200">{ep.path}</code>
              </div>
              <p className="text-sm text-zinc-500">{ep.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-sm font-medium text-zinc-300 mb-2">Vercel Cron Schedule</p>
          <p className="text-sm text-zinc-500">
            The broadcast runs on the schedule <code className="text-emerald-400 bg-white/5 px-1.5 py-0.5 rounded text-xs">0 */4 * * *</code> (every
            4 hours at minute 0). You can also trigger it manually from the /telegram settings
            page or by calling POST /api/telegram/broadcast.
          </p>
        </div>
      </section>

>>>>>>> origin/main
      <PageNav prev={prev} next={next} githubPath="apps/web/app/docs/telegram/page.tsx" />
    </article>
  );
}
