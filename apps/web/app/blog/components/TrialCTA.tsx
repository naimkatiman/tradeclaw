import Link from 'next/link';

interface TrialCTAProps {
  headline: string;
  pitch: string;
  secondaryLabel?: string;
}

export function TrialCTA({
  headline,
  pitch,
  secondaryLabel = 'Read the source on GitHub',
}: TrialCTAProps) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mt-6">
      <p className="text-zinc-100 text-sm font-semibold mb-1">{headline}</p>
      <p className="text-zinc-300 text-sm">{pitch}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/pricing"
          className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400"
        >
          Start 7-Day Trial →
        </Link>
        <a
          href="https://github.com/naimkatiman/tradeclaw"
          className="inline-flex items-center justify-center rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-500"
          target="_blank"
          rel="noreferrer"
        >
          {secondaryLabel}
        </a>
      </div>
    </div>
  );
}
