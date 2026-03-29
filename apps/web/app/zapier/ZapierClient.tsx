'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Mail,
  Sheet,
  Hash,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Webhook,
  Code,
  ArrowRight,
  Globe,
  Settings,
} from 'lucide-react';

const PAYLOAD_EXAMPLE = `{
  "pair": "BTCUSD",
  "direction": "BUY",
  "confidence": 87,
  "price": 67234.50,
  "tp": 68500.00,
  "sl": 66100.00,
  "timeframe": "H1",
  "timestamp": "2026-03-29T10:00:00Z",
  "indicators": {
    "rsi": 42.3,
    "macd": 0.0012,
    "ema20": 67100
  }
}`;

const ZAP_TEMPLATES = [
  {
    id: 'email',
    icon: Mail,
    title: 'Signal → Email',
    subtitle: 'Get an email every time TradeClaw fires a BUY or SELL signal',
    color: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30',
    badge: 'Most Popular',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    zapierUrl: 'https://zapier.com/apps/webhook/integrations/gmail',
    steps: [
      {
        num: '01',
        title: 'Create a Zap in Zapier',
        desc: 'Go to zapier.com → Make a Zap → choose "Webhooks by Zapier" as trigger → select "Catch Hook".',
      },
      {
        num: '02',
        title: 'Copy your Zapier Webhook URL',
        desc: 'Zapier will generate a unique webhook URL like https://hooks.zapier.com/hooks/catch/xxxxx/yyyyy',
      },
      {
        num: '03',
        title: 'Add it to TradeClaw',
        desc: 'Go to Settings → Webhooks → Add Webhook → paste the Zapier URL. Toggle Active and save.',
      },
      {
        num: '04',
        title: 'Configure the Email action',
        desc: 'Choose Gmail (or Email by Zapier) as the action. Map fields: Subject = "{{pair}} {{direction}} Signal", Body = "Confidence: {{confidence}}% | Entry: {{price}} | TP: {{tp}} | SL: {{sl}}".',
      },
      {
        num: '05',
        title: 'Add a Filter (optional)',
        desc: 'Add a Filter step: only continue if "confidence" is greater than 70 to skip low-confidence signals.',
      },
    ],
  },
  {
    id: 'sheets',
    icon: Sheet,
    title: 'Signal → Google Sheets',
    subtitle: 'Log every signal to a spreadsheet for analysis and backtesting',
    color: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30',
    badge: 'Best for Analysis',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
    zapierUrl: 'https://zapier.com/apps/webhook/integrations/google-sheets',
    steps: [
      {
        num: '01',
        title: 'Create a Google Sheet',
        desc: 'Create a new sheet with headers: Timestamp, Pair, Direction, Confidence, Price, TP, SL, Timeframe, RSI, MACD, EMA20.',
      },
      {
        num: '02',
        title: 'Set up Zapier Webhook trigger',
        desc: 'Webhooks by Zapier → Catch Hook. Copy the URL and add it to TradeClaw Settings → Webhooks.',
      },
      {
        num: '03',
        title: 'Test the trigger',
        desc: 'Go back to TradeClaw and click "Test" on your webhook. Zapier will receive a sample payload to map fields from.',
      },
      {
        num: '04',
        title: 'Map JSON fields to columns',
        desc: 'In the Google Sheets action, map: timestamp → Timestamp, pair → Pair, direction → Direction, confidence → Confidence, price → Price, tp → TP, sl → SL, timeframe → Timeframe, indicators.rsi → RSI, indicators.macd → MACD, indicators.ema20 → EMA20.',
      },
      {
        num: '05',
        title: 'Publish and monitor',
        desc: 'Turn on your Zap. Every new signal from TradeClaw will append a row to your sheet automatically.',
      },
    ],
  },
  {
    id: 'slack',
    icon: Hash,
    title: 'Signal → Slack',
    subtitle: 'Post signal alerts to your Slack channel with formatted embeds',
    color: 'from-purple-500/20 to-violet-500/10 border-purple-500/30',
    badge: 'Team Favorite',
    badgeColor: 'bg-purple-500/20 text-purple-400',
    zapierUrl: 'https://zapier.com/apps/webhook/integrations/slack',
    steps: [
      {
        num: '01',
        title: 'Add Webhooks trigger',
        desc: 'New Zap → Webhooks by Zapier → Catch Hook. Copy the URL.',
      },
      {
        num: '02',
        title: 'Register in TradeClaw',
        desc: 'Settings → Webhooks → Add Webhook → paste URL → set "Slack" as the name → enable. TradeClaw auto-formats Slack Block Kit messages when it detects a Slack webhook.',
      },
      {
        num: '03',
        title: 'Add Formatter (optional)',
        desc: 'Use Zapier Formatter to build a richer message: "{{direction}} {{pair}} at ${{price}} — {{confidence}}% confidence. TP: ${{tp}} | SL: ${{sl}}".',
      },
      {
        num: '04',
        title: 'Configure Slack action',
        desc: 'Choose "Send Channel Message". Select your channel (e.g., #trading-signals). Set the message text or use the formatted output from step 3.',
      },
      {
        num: '05',
        title: 'Filter by direction',
        desc: 'Optional: add a Filter → only continue if direction = BUY (for bull-only channels) or direction = SELL.',
      },
    ],
  },
];

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
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors border border-zinc-700 hover:border-zinc-600"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : label}
    </button>
  );
}

function ZapCard({ template }: { template: typeof ZAP_TEMPLATES[0] }) {
  const [open, setOpen] = useState(false);
  const Icon = template.icon;

  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${template.color} backdrop-blur-sm`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900/80 border border-zinc-700 flex items-center justify-center">
              <Icon className="w-5 h-5 text-zinc-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">{template.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${template.badgeColor}`}>{template.badge}</span>
              </div>
              <p className="text-sm text-zinc-400 mt-0.5">{template.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={template.zapierUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #FF4A00, #ff6b3d)' }}
          >
            <Zap className="w-4 h-4" />
            Connect on Zapier
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 transition-colors border border-zinc-700"
          >
            Setup Guide
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-6 pb-6 border-t border-zinc-700/50 pt-5">
          <h4 className="text-sm font-medium text-zinc-300 mb-4">Step-by-step setup</h4>
          <div className="space-y-4">
            {template.steps.map((step) => (
              <div key={step.num} className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-zinc-400">{step.num}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{step.title}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ZapierClient() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back nav */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FF4A00, #ff6b3d)' }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">TradeClaw × Zapier</h1>
              <p className="text-zinc-400 text-sm mt-0.5">Connect to 6,000+ apps. No code required.</p>
            </div>
          </div>
          <p className="text-zinc-300 text-base leading-relaxed max-w-2xl">
            TradeClaw fires a webhook every time a signal is generated. Use Zapier to route those signals
            to any tool you already use — email, spreadsheets, Slack, Notion, Airtable, and thousands more.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="https://zapier.com/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF4A00, #ff6b3d)' }}
            >
              <ExternalLink className="w-4 h-4" />
              Create Free Zapier Account
            </a>
            <Link
              href="/webhooks"
              className="flex items-center gap-2 text-sm px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            >
              <Settings className="w-4 h-4" />
              Manage Webhooks
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mb-12 rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <Globe className="w-4 h-4 text-zinc-400" />
            How it works
          </h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {[
              { icon: Zap, label: 'TradeClaw fires signal', sub: 'RSI + MACD confluence detected' },
              { icon: Webhook, label: 'Webhook is sent', sub: 'JSON payload to your Zapier URL' },
              { icon: Code, label: 'Zapier receives it', sub: 'Trigger activates your Zap' },
              { icon: Globe, label: 'Action runs', sub: 'Email, Sheet, Slack, and more' },
            ].map((item, i) => {
              const ItemIcon = item.icon;
              return (
                <div key={i} className="flex sm:flex-col items-center gap-3 sm:gap-2 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
                    <ItemIcon className="w-5 h-5 text-zinc-300" />
                  </div>
                  <div className="sm:text-center">
                    <p className="text-sm font-medium text-white">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.sub}</p>
                  </div>
                  {i < 3 && (
                    <ArrowRight className="w-4 h-4 text-zinc-600 hidden sm:block sm:absolute sm:relative flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Zap Templates */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-6">Ready-to-use Zap Templates</h2>
          <div className="space-y-4">
            {ZAP_TEMPLATES.map((template) => (
              <ZapCard key={template.id} template={template} />
            ))}
          </div>
        </div>

        {/* Webhook Setup */}
        <div className="mb-12 rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
          <h2 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
            <Webhook className="w-4 h-4 text-zinc-400" />
            Setting up your TradeClaw Webhook
          </h2>
          <ol className="space-y-4">
            {[
              { step: '1', text: 'In Zapier, create a new Zap and select Webhooks by Zapier → Catch Hook as the trigger.' },
              { step: '2', text: 'Copy the generated Zapier webhook URL (looks like https://hooks.zapier.com/hooks/catch/...).' },
              {
                step: '3',
                text: 'In TradeClaw, go to Settings → Webhooks → Add Webhook. Paste the Zapier URL, give it a name, and click Save.',
              },
              { step: '4', text: 'Click the "Test" button on your new webhook in TradeClaw. A sample signal payload will be sent to Zapier.' },
              { step: '5', text: 'Back in Zapier, click "Test trigger" to confirm the data arrived. Then build your action.' },
            ].map(({ step, text }) => (
              <li key={step} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center">
                  {step}
                </span>
                <p className="text-sm text-zinc-300 pt-0.5">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-5">
            <Link
              href="/webhooks"
              className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            >
              <Settings className="w-4 h-4" />
              Open Webhook Settings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Payload Reference */}
        <div className="mb-12 rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Code className="w-4 h-4 text-zinc-400" />
              Signal Payload Reference
            </h2>
            <CopyButton text={PAYLOAD_EXAMPLE} label="Copy JSON" />
          </div>
          <p className="text-sm text-zinc-400 mb-4">
            This is the JSON body TradeClaw sends to your Zapier webhook on every signal. Use these field names
            when mapping data in Zapier.
          </p>
          <pre className="text-xs text-zinc-300 bg-zinc-950 rounded-xl p-4 overflow-x-auto border border-zinc-800 leading-relaxed">
            {PAYLOAD_EXAMPLE}
          </pre>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { field: 'pair', desc: 'Asset symbol (e.g. BTCUSD)' },
              { field: 'direction', desc: 'BUY or SELL' },
              { field: 'confidence', desc: 'Score 0–100' },
              { field: 'price', desc: 'Entry price' },
              { field: 'tp', desc: 'Take profit level' },
              { field: 'sl', desc: 'Stop loss level' },
            ].map(({ field, desc }) => (
              <div key={field} className="bg-zinc-800/60 rounded-lg p-3 border border-zinc-700/50">
                <code className="text-xs text-emerald-400 font-mono">{field}</code>
                <p className="text-xs text-zinc-500 mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Make.com callout */}
        <div className="mb-12 rounded-2xl bg-zinc-900/50 border border-zinc-800 p-6 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
            <Globe className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Prefer Make.com (formerly Integromat)?</h3>
            <p className="text-sm text-zinc-400">
              TradeClaw webhooks work with any platform that can receive an HTTP POST. Check out our{' '}
              <Link href="/marketplace" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Webhook Marketplace
              </Link>{' '}
              for Make.com, n8n, IFTTT, Pipedream, and Airtable templates.
            </p>
          </div>
        </div>

        {/* CTA footer */}
        <div
          className="rounded-2xl p-8 text-center border"
          style={{
            background: 'linear-gradient(135deg, rgba(255,74,0,0.12), rgba(255,74,0,0.04))',
            borderColor: 'rgba(255,74,0,0.2)',
          }}
        >
          <Zap className="w-8 h-8 mx-auto mb-3" style={{ color: '#FF4A00' }} />
          <h3 className="text-xl font-bold text-white mb-2">Ready to automate?</h3>
          <p className="text-zinc-400 text-sm mb-6 max-w-sm mx-auto">
            Zapier is free for up to 100 tasks/month. That&apos;s plenty to get started routing signals to your tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://zapier.com/sign-up"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #FF4A00, #ff6b3d)' }}
            >
              <ExternalLink className="w-4 h-4" />
              Start Free on Zapier
            </a>
            <Link
              href="/webhooks"
              className="flex items-center justify-center gap-2 text-sm px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
            >
              <Settings className="w-4 h-4" />
              Configure Webhooks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
