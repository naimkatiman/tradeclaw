import Link from 'next/link';

export default function EarningsEdgePricing() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-medium text-amber-300">Paid access unavailable</p>
      <h1 className="mt-3 text-4xl font-bold">The hosted subscription flow is not enabled.</h1>
      <p className="mt-5 text-lg leading-relaxed text-gray-400">
        EarningsEdge currently exposes only the server-limited free analyzer. Checkout is disabled
        until authenticated entitlement, billing lifecycle, and paid feature delivery are verified end to end.
      </p>
      <div className="mt-8 border-y border-white/10 py-6 text-sm text-gray-400">
        Current limit: up to 3 analysis requests per rolling 24 hours per network address. Availability
        also depends on the operator configuring the OpenRouter model service.
      </div>
      <Link href="/earningsedge/analyze" className="mt-8 inline-flex rounded-md bg-green-500 px-5 py-3 font-semibold text-black hover:bg-green-400">
        Open the free analyzer
      </Link>
    </main>
  );
}
