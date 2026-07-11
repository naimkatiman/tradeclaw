import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '../components/navbar';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Why Long-Term | TradeClaw',
  description:
    'The external, peer-reviewed and regulatory record on why frequent short-term trading loses after costs, and why minimizing turnover is the rational default for a small account.',
};

/**
 * /why-long-term — the external evidence ledger.
 *
 * Our own engine measures anti-timing: after real costs, single-asset
 * short-term timing is net-negative. This page carries the wider record.
 * Every claim, number, attribution and URL comes from the single source of
 * truth: docs/research/2026-07-07-external-citations-short-term-vs-long-term.md.
 * Nothing here claims that holding any specific asset guarantees profit.
 */

interface Source {
  label: string;
  url?: string;
}

interface Evidence {
  figure: string;
  finding: string;
  who: string;
  measured: string;
  caveat?: string;
  sources: Source[];
}

interface Section {
  heading: string;
  frame: string;
  entries: Evidence[];
}

const SECTIONS: Section[] = [
  {
    heading: 'Active management versus the index',
    frame: 'Professionals with research desks and low costs mostly fail to beat a passive benchmark, and the gap widens the longer you look.',
    entries: [
      {
        figure: '89.5%',
        finding:
          'of actively managed US large-cap funds underperformed the S&P 500 over the 15 years ending December 2024.',
        who: 'S&P Dow Jones Indices, SPIVA U.S. Scorecard, year-end 2024 and 2025',
        measured:
          'The share of active US equity funds beaten by their benchmark over 15 years. Zero of 22 US equity categories had a majority of active managers beat their benchmark over that span, and 79% underperformed in calendar 2025 alone. Underperformance rises with the horizon.',
        sources: [{ label: 'S&P Dow Jones Indices', url: 'https://www.spglobal.com/spdji/en/spiva/article/spiva-us/' }],
      },
    ],
  },
  {
    heading: 'What individual traders earn',
    frame: 'When researchers get complete brokerage or market data, the same pattern appears across countries: the more households trade, the worse they do.',
    entries: [
      {
        figure: '−6.5pp',
        finding:
          'per year separated the most active households from the market. The busiest quintile earned 11.4% a year while the market returned 17.9%.',
        who: 'Barber and Odean, Trading Is Hazardous to Your Wealth, Journal of Finance, 2000',
        measured:
          '66,465 US households at a large discount broker from 1991 to 1996, ranked by turnover. The average household earned 16.4% a year against a 17.9% market, and the shortfall tracked how much they traded, not which stocks they picked.',
        sources: [
          { label: 'Journal of Finance', url: 'https://onlinelibrary.wiley.com/doi/abs/10.1111/0022-1082.00226' },
          { label: 'Author copy (PDF)', url: 'https://faculty.haas.berkeley.edu/odean/papers/returns/individual_investor_performance_final.pdf' },
        ],
      },
      {
        figure: '2.2%',
        finding:
          'of Taiwan’s GDP was the aggregate sum individual traders lost by trading, over the period studied.',
        who: 'Barber, Lee, Liu and Odean, Just How Much Do Individual Investors Lose by Trading?, Review of Financial Studies, 2009',
        measured:
          'Every trade in the complete Taiwan market. Individual losses summed to 2.2% of national output, and institutions gained about 1.5 percentage points a year taking the other side of those trades.',
        sources: [{ label: 'Review of Financial Studies', url: 'https://academic.oup.com/rfs/article-abstract/22/2/609/1595677' }],
      },
      {
        figure: '<1%',
        finding:
          'of the day-trader population predictably earns positive abnormal returns net of fees in a given year.',
        who: 'Barber, Lee, Liu and Odean, The Cross-Section of Speculator Skill, Taiwan day traders',
        measured:
          'Whether day-trading success persists from one year to the next, which would indicate skill rather than luck. For all but a tiny fraction of traders, it does not.',
        sources: [{ label: 'Working paper (PDF)', url: 'https://faculty.haas.berkeley.edu/odean/papers/day%20traders/The%20Cross-Section%20of%20Speculator%20Skill.pdf' }],
      },
      {
        figure: '97%',
        finding:
          'of people who persisted at day trading for more than 300 days lost money.',
        who: 'Chague, De-Losso and Giovannetti, Day Trading for a Living?, 2020',
        measured:
          'Every individual who day-traded persistently in the Brazilian equity-futures market. Of those who kept going, 1.1% earned more than the minimum wage and 0.5% more than a bank teller, with no sign that experience improved the odds.',
        sources: [{ label: 'SSRN', url: 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101' }],
      },
    ],
  },
  {
    heading: 'The behavior gap',
    frame: 'Even investors who own the right funds capture less than the funds return, because they move money at the wrong times.',
    entries: [
      {
        figure: '848bp',
        finding:
          'was the 2024 shortfall of the average equity fund investor: 16.54% earned against the 25.02% the S&P 500 returned, the second-largest gap in a decade.',
        who: 'DALBAR, Quantitative Analysis of Investor Behavior 2025',
        measured:
          'Dollar-weighted investor returns, which account for when money actually entered and left funds, set against the index. The gap measures the cost of timing, not of fund selection.',
        caveat:
          'DALBAR’s methodology has published critics, so we pair it with SPIVA and the Barber and Odean studies above and do not lead with it.',
        sources: [{ label: 'DALBAR', url: 'https://www.dalbar.com/press-release/investors-missed-the-best-of-2024s-market-gains-latest-dalbar-investor-behavior-report-finds/' }],
      },
      {
        figure: '9.8% vs 13%',
        finding:
          'a year over the last decade: investor return against the S&P 500. The one-year gap for 2025 narrowed to 72 basis points, 17.16% against 17.88%.',
        who: 'DALBAR, Quantitative Analysis of Investor Behavior 2026, calendar 2025',
        measured:
          'The same dollar-weighted method over a ten-year window. The gap shrinks in calm years and widens in volatile ones, which is the point: timing costs most when it feels most necessary.',
        sources: [{ label: 'PR Newswire', url: 'https://www.prnewswire.com/news-releases/dalbars-2026-qaib-report-shows-narrower-investor-gap-amid-a-complex-and-volatile-market-year-302745998.html' }],
      },
    ],
  },
  {
    heading: 'Product-level loss rates',
    frame: 'Regulators who force brokers to report account outcomes find that most retail clients lose on the leveraged, high-turnover products marketed to them.',
    entries: [
      {
        figure: '74–89%',
        finding:
          'of retail CFD accounts lose money, with average losses between €1,600 and €29,000 per client.',
        who: 'EU national regulators’ analyses cited by ESMA, 2018',
        measured:
          'Account-level results compiled by EU national regulators and cited by ESMA when it restricted CFDs for retail clients. These are reported shares of accounts that lost money, not modeled estimates. They are the origin of the mandated “XX% of retail investor accounts lose money” warning.',
        sources: [{ label: 'ESMA', url: 'https://www.esma.europa.eu/press-news/esma-news/esma-agrees-prohibit-binary-options-and-restrict-cfds-protect-retail-investors' }],
      },
      {
        figure: '82%',
        finding:
          'of sampled retail CFD clients lost money, at an average loss of £2,200.',
        who: 'UK Financial Conduct Authority, CP16/40, 2016',
        measured:
          'A UK regulator’s direct sample of retail CFD accounts at authorised firms, measured rather than surveyed.',
        sources: [{ label: 'FCA (PDF)', url: 'https://www.fca.org.uk/publication/consultation/cp16-40.pdf' }],
      },
      {
        figure: '$6.4B',
        finding:
          'in aggregate trading costs fell on retail options traders, who lost about $2.1 billion between November 2019 and June 2021.',
        who: 'Bryzgalova, Pavlova and Sikorskaya, Retail Trading in Options and the Rise of the Big Three Wholesalers, Journal of Finance, 2023',
        measured:
          'Retail options order flow and the costs attached to it. Retail-preferred weekly options carried an average bid-ask spread of 12.6%, and three wholesalers handle about 85% of options payment for order flow, so that spread is where the cost lands.',
        sources: [{ label: 'Journal of Finance', url: 'https://onlinelibrary.wiley.com/doi/full/10.1111/jofi.13285' }],
      },
      {
        figure: '73–81%',
        finding:
          'of retail crypto-app users are estimated to have lost money on bitcoin.',
        who: 'Bank for International Settlements, Working Paper 1049, 95 countries, 2015 to 2022',
        measured:
          'App-level usage across 95 countries. New users skewed young and male and tended to arrive after prices had already risen, and on-chain data showed larger holders selling into that retail buying.',
        sources: [{ label: 'BIS', url: 'https://www.bis.org/publ/work1049.htm' }],
      },
    ],
  },
  {
    heading: 'Rules written for bigger money',
    frame: 'The plumbing itself carries a cost that lands hardest on small, frequent traders. This is a documented asymmetry, not a conspiracy.',
    entries: [
      {
        figure: '$34.1M',
        finding:
          'was what Robinhood customers lost to inferior execution, net of the commissions they saved. The firm paid a $65 million penalty.',
        who: 'US Securities and Exchange Commission, press release 2020-321',
        measured:
          'The SEC’s finding on how payment-for-order-flow routing degraded execution quality. The hidden execution cost exceeded the commissions the “commission-free” model removed.',
        sources: [{ label: 'SEC', url: 'https://www.sec.gov/newsroom/press-releases/2020-321' }],
      },
      {
        figure: '3 markets',
        finding:
          'have banned payment for order flow, the UK, Australia and Canada, with the EU agreeing a phased ban.',
        who: 'SEC Division of Economic and Risk Analysis, working paper, 2025; ban context from Congressional Research Service IF12594',
        measured:
          'An internal SEC economic analysis of how payment for order flow influences markets, set against its regulatory status abroad. The SEC’s own economists document the tension between PFOF and best execution.',
        sources: [{ label: 'SEC DERA (PDF)', url: 'https://www.sec.gov/files/dera_wp_payment-order-flow-2501.pdf' }],
      },
      {
        figure: '$25,000',
        finding:
          'was the minimum equity a US account needed to day-trade freely. For 25 years the pattern day trader rule bound only accounts below that line.',
        who: 'FINRA, Regulatory Notice 26-10, rule in force 2001 to 2026',
        measured:
          'The threshold separated accounts allowed to place four or more day trades in five business days from those that were not: it applied below $25,000 and not above. The rule was eliminated effective June 4, 2026, replaced by exposure-proportional intraday margin.',
        sources: [{ label: 'FINRA', url: 'https://www.finra.org/rules-guidance/notices/26-10' }],
      },
    ],
  },
];

const externalLinkClass =
  'text-[13px] text-[var(--text-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors duration-200 hover:text-[var(--foreground)]';

function EvidenceEntry({ entry }: { entry: Evidence }) {
  return (
    <article className="py-7 first:pt-0 last:pb-0">
      <p className="max-w-prose text-[15px] leading-relaxed text-[var(--foreground)]">
        <span className="mr-1.5 font-mono text-2xl font-semibold tabular-nums leading-none text-[var(--foreground)] sm:text-3xl">
          {entry.figure}
        </span>
        {entry.finding}
      </p>
      <p className="mt-3 text-[13px] font-medium text-[var(--foreground)]">{entry.who}</p>
      <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
        {entry.measured}
      </p>
      {entry.caveat && (
        <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-[var(--text-secondary)]">
          <span className="font-medium text-[var(--foreground)]">Caveat.</span> {entry.caveat}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {entry.sources.map((source) =>
          source.url ? (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className={externalLinkClass}
            >
              {source.label}
            </a>
          ) : (
            <span key={source.label} className="text-[13px] text-[var(--text-secondary)]">
              {source.label}
            </span>
          ),
        )}
      </div>
    </article>
  );
}

export default function WhyLongTermPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28">
        <div className="mx-auto max-w-5xl px-4 pb-24">
          {/* Opening: tie to our own measured finding, then hand off to the record. */}
          <header>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              The external record
            </p>
            <h1 className="font-display mt-4 text-[clamp(2.25rem,5vw,3.75rem)] font-bold uppercase leading-[0.95] tracking-tight">
              The more you trade,
              <br />
              <span className="text-[var(--color-down)]">the more you lose.</span>
            </h1>
            <p className="mt-6 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
              We built a real signal engine, charged every sized trade its real execution cost,
              and published what came out: after costs, net expectancy is negative. That is{' '}
              <Link href="/" className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]">
                our own finding
              </Link>{' '}
              on one problem, and you can{' '}
              <Link href="/track-record" className="text-[var(--foreground)] underline decoration-[var(--border)] underline-offset-4 hover:decoration-[var(--foreground)]">
                audit it on the track record
              </Link>
              . This page is the wider record: the peer-reviewed and regulatory evidence on what
              frequent short-term trading does to the people who do it, and why holding, which
              minimizes turnover, is the rational default for a small account.
            </p>
          </header>

          {/* Evidence ledger: one entry per citation, stacked with divider borders. */}
          <div className="mt-16 space-y-14">
            {SECTIONS.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-[clamp(1.375rem,2.6vw,1.875rem)] font-semibold uppercase leading-tight tracking-tight">
                  {section.heading}
                </h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--text-secondary)]">
                  {section.frame}
                </p>
                <div className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                  {section.entries.map((entry) => (
                    <EvidenceEntry key={entry.who} entry={entry} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Close: anti-timing-not-pro-asset framing + unfavorable disclosure. */}
          <section className="mt-20 border-t border-[var(--border)] pt-10">
            <h2 className="font-display text-[clamp(1.375rem,2.6vw,1.875rem)] font-semibold uppercase leading-tight tracking-tight">
              What this proves, and what it does not
            </h2>
            <p className="mt-5 max-w-prose text-[15px] leading-relaxed text-[var(--foreground)]">
              Read together, these studies measure one thing from many angles: frequent short-term
              trading, after real costs, is net-negative for the people who do it. Our own engine
              reaches the same result on a single problem. Turnover is a cost you pay with certainty,
              and holding is how you minimize the one cost you can actually control.
            </p>
            <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-[var(--text-secondary)]">
              This is not a case for buying and holding any particular asset. Long horizons do not
              rescue a bad asset. Our own benchmark note records that the crypto basket we track lost
              roughly half its value in the window from June 2024 onward: holding it longer would have
              deepened that loss, not reversed it. The evidence on this page is about cost and turnover,
              not about picking winners.
            </p>

            <div className="mt-8 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-200/90">
              <strong className="font-semibold">Not financial advice, not a profit claim.</strong>{' '}
              This is a summary of published research and regulatory findings, provided so you can
              check the sources yourself. What you do with your money is your decision.
            </div>

            <nav className="mt-8 flex flex-wrap gap-3" aria-label="Related transparency pages">
              <Link
                href="/research"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
              >
                What we tested and killed
              </Link>
              <Link
                href="/methodology"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
              >
                How we measure cost
              </Link>
              <Link
                href="/open-data"
                className="rounded-[var(--radius-pill)] border border-[var(--border)] px-5 py-2.5 text-sm font-medium text-[var(--text-secondary)] transition-all duration-200 hover:border-[var(--glass-border-accent)] hover:text-[var(--foreground)]"
              >
                Take the raw data
              </Link>
            </nav>
          </section>
        </div>
      </main>
    </>
  );
}
