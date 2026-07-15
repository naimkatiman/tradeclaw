import Link from 'next/link';
import { ArrowLeft, Ban, CheckCircle2, ExternalLink, KeyRound, ServerCog, ShieldCheck, Terminal } from 'lucide-react';

const nativeDetails = [
  { label: 'Venue', value: 'Binance USD-M Futures' },
  { label: 'Strategy scope', value: 'hmm-top3 executor' },
  { label: 'Configuration', value: 'Server environment variables' },
  { label: 'Default write mode', value: 'Disabled' },
];

export default function ExchangesClient() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <header className="border-b border-zinc-800">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to TradeClaw
          </Link>

          <div className="flex items-center gap-3">
            <ServerCog className="h-8 w-8 text-emerald-400" />
            <h1 className="text-3xl font-bold md:text-4xl">Exchange execution status</h1>
          </div>
          <p className="mt-4 max-w-2xl text-zinc-400">
            TradeClaw does not currently provide a generic exchange connector or a browser-based credential flow.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-14 px-6 py-12">
        <section aria-labelledby="generic-status-heading" className="border-b border-zinc-800 pb-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-amber-300">
                <Ban className="h-4 w-4" />
                Not implemented
              </div>
              <h2 id="generic-status-heading" className="text-2xl font-semibold">
                Generic exchange connections
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                The public API returns an empty exchange list. Connection attempts return HTTP 501 and do not process or
                store credentials.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
              <KeyRound className="h-5 w-5 shrink-0" />
              Do not submit exchange keys to this page.
            </div>
          </div>
        </section>

        <section aria-labelledby="native-heading">
          <div className="mb-6 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h2 id="native-heading" className="text-2xl font-semibold">
              Implemented execution path
            </h2>
          </div>
          <p className="mb-6 max-w-3xl text-sm leading-6 text-zinc-400">
            The repository contains a server-side Binance futures executor. Its runtime availability depends on operator
            configuration and cannot be verified from this public page.
          </p>

          <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-800 sm:grid-cols-2">
            {nativeDetails.map((detail) => (
              <div key={detail.label} className="bg-zinc-950 px-5 py-4">
                <dt className="text-xs uppercase text-zinc-500">{detail.label}</dt>
                <dd className="mt-1 text-sm font-medium text-zinc-100">{detail.value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex items-start gap-3 border-l-2 border-emerald-500 px-4 py-2 text-sm leading-6 text-zinc-400">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            Order writes are gated by <code className="text-zinc-200">EXECUTION_MODE</code>, which defaults to{' '}
            <code className="text-zinc-200">disabled</code> in the Docker configuration.
          </div>
        </section>

        <section aria-labelledby="api-heading" className="border-t border-zinc-800 pt-12">
          <div className="mb-5 flex items-center gap-3">
            <Terminal className="h-5 w-5 text-sky-400" />
            <h2 id="api-heading" className="text-xl font-semibold">
              Public endpoint behavior
            </h2>
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-5 font-mono text-sm leading-7 text-zinc-300">
            <div>
              <span className="text-sky-400">GET</span> /api/exchanges - empty list, status not-implemented
            </div>
            <div>
              <span className="text-amber-300">POST</span> /api/exchanges - HTTP 501, credentials not processed
            </div>
          </div>
        </section>

        <section className="flex flex-col items-start justify-between gap-5 border-t border-zinc-800 pt-10 sm:flex-row sm:items-center">
          <p className="max-w-xl text-sm text-zinc-400">
            Inspect the executor and its safety gates in the source before configuring a self-hosted instance.
          </p>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-medium transition-colors hover:border-zinc-500"
          >
            View source
            <ExternalLink className="h-4 w-4" />
          </a>
        </section>
      </div>
    </main>
  );
}
