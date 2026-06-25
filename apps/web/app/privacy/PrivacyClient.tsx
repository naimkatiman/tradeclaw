'use client';

import Link from 'next/link';

export function PrivacyClient() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      <section className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">1. Data We Collect</h2>
          <p className="mb-2">
            TradeClaw is designed to collect the minimum data necessary:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Account data:</strong> email address (if you sign up), Telegram username (optional),
              and subscription tier.
            </li>
            <li>
              <strong>Usage data:</strong> API key usage counts, signal history, and feature preferences
              stored in our database or local JSON files.
            </li>
            <li>
              <strong>Client-side data:</strong> localStorage items such as onboarding progress, watchlists,
              alert settings, and theme preference. This never leaves your browser unless you explicitly
              export it.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">2. How We Use Data</h2>
          <p className="mb-2">We use collected data solely to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Provide and maintain signal generation, backtesting, and dashboard services.</li>
            <li>Process subscriptions and billing through Stripe.</li>
            <li>Send optional Telegram or browser notifications you configure.</li>
            <li>Improve signal accuracy and platform performance via aggregated, anonymized metrics.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">3. Third-Party Services</h2>
          <p className="mb-2">We rely on a small number of trusted third parties:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Stripe</strong> — payment processing. Card details are handled directly by Stripe
              and never touch our servers.
            </li>
            <li>
              <strong>Telegram Bot API</strong> — optional alert delivery. Messages are sent only when
              you explicitly subscribe.
            </li>
            <li>
              <strong>CoinGecko / Yahoo Finance / Binance</strong> — public market data sources for
              signal generation. No personal data is shared with them.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">4. Cookies & Local Storage</h2>
          <p>
            We do not use tracking cookies or advertising pixels. We use essential localStorage entries
            for UI state (theme, onboarding, alert preferences) and session cookies for authentication
            when you are logged in.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">5. Data Retention</h2>
          <p>
            Signal history and track-record data are retained indefinitely to support public transparency
            and leaderboard accuracy. Account data is retained while your account is active. You may request
            deletion by contacting us via Discord or GitHub.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">6. Self-Hosting & Data Sovereignty</h2>
          <p>
            Because TradeClaw is open source, you may self-host your own instance. In a self-hosted
            deployment, you control all data and no information is sent to TradeClaw-operated servers.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">7. Your Rights</h2>
          <p className="mb-2">Depending on your jurisdiction, you may have the right to:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Access the personal data we hold about you.</li>
            <li>Request correction or deletion of your data.</li>
            <li>Object to certain processing activities.</li>
            <li>Withdraw consent for optional features (e.g., Telegram alerts).</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy as the platform evolves. Material changes will be announced
            in the weekly digest and on Discord.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">9. Contact</h2>
          <p>
            Privacy questions? Reach us on{' '}
            <Link href="/discord/server" className="text-[var(--foreground)] underline underline-offset-2">
              Discord
            </Link>{' '}
            or open an issue on{' '}
            <a
              href="https://github.com/naimkatiman/tradeclaw"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--foreground)] underline underline-offset-2"
            >
              GitHub
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
