'use client';

import Link from 'next/link';

export function TermsClient() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mb-8 text-sm text-[var(--text-secondary)]">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </p>

      <section className="space-y-8 text-sm leading-relaxed text-[var(--text-secondary)]">
        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">1. Not Financial Advice</h2>
          <p>
            TradeClaw provides algorithmic trading signals for informational and educational purposes only.
            Nothing on this platform constitutes financial advice, investment advice, or a recommendation to buy,
            sell, or hold any security, cryptocurrency, or financial instrument. All trading decisions are solely
            your responsibility.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">2. No Guarantees</h2>
          <p>
            Past performance displayed on leaderboards, backtests, or track-record pages does not guarantee
            future results. Signal accuracy, win rates, and profitability metrics are based on historical data
            and simulated or tracked outcomes. There is no assurance that future signals will perform similarly.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">3. Risk Acknowledgment</h2>
          <p>
            Trading involves substantial risk of loss and is not suitable for every investor. You should
            carefully consider whether trading is appropriate for you in light of your experience, objectives,
            and financial resources. You may lose all or more of your initial investment.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">4. Subscriptions & Billing</h2>
          <p>
            Pro and Elite subscriptions are billed via Stripe. You may cancel at any time through the billing
            portal. No refunds are provided for partial billing periods unless required by law. Prices are
            subject to change with 30 days notice.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">5. Open Source License</h2>
          <p>
            The TradeClaw codebase is released under the MIT License. You are free to self-host, modify, and
            distribute the software subject to the terms of that license. The MIT License does not extend to
            paid subscription services, hosted data, or premium signal content.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">6. Data & Privacy</h2>
          <p>
            We collect minimal data necessary to operate the service. See our{' '}
            <Link href="/privacy" className="text-[var(--foreground)] underline underline-offset-2">
              Privacy Policy
            </Link>{' '}
            for details.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">7. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, TradeClaw and its contributors shall not be liable for
            any direct, indirect, incidental, special, or consequential damages arising out of or in connection
            with your use of the platform, signals, or self-hosted software.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">8. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Continued use of the platform after changes constitutes
            acceptance of the revised Terms.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-lg font-semibold text-[var(--foreground)]">9. Contact</h2>
          <p>
            For questions about these Terms, reach out via{' '}
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
