'use client';

export default function TodayError() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 pt-20" data-condition="error" data-verdict="unavailable">
      <h1 className="text-2xl font-semibold">This check could not be read.</h1>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">Follows stay on this device.</p>
      <a href="/today" className="premium-button-primary mt-4 inline-flex">
        Try today&apos;s check again
      </a>
    </main>
  );
}
