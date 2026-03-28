type FeatureValue = boolean | string;

interface ComparisonRow {
  feature: string;
  tradeclaw: FeatureValue;
  tradingview: FeatureValue;
  threecommas: FeatureValue;
  cryptohopper: FeatureValue;
}

const ROWS: ComparisonRow[] = [
  {
    feature: "Price",
    tradeclaw: "Free",
    tradingview: "$60/mo",
    threecommas: "$49/mo",
    cryptohopper: "$107/mo",
  },
  {
    feature: "Open Source",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    cryptohopper: false,
  },
  {
    feature: "Self-Hosted",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    cryptohopper: false,
  },
  {
    feature: "AI Signals",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    cryptohopper: true,
  },
  {
    feature: "Multi-Asset (Forex + Crypto + Metals)",
    tradeclaw: true,
    tradingview: true,
    threecommas: false,
    cryptohopper: false,
  },
  {
    feature: "Custom Strategies",
    tradeclaw: true,
    tradingview: true,
    threecommas: true,
    cryptohopper: true,
  },
  {
    feature: "API Access",
    tradeclaw: true,
    tradingview: true,
    threecommas: true,
    cryptohopper: true,
  },
  {
    feature: "Signal Sharing",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    cryptohopper: false,
  },
  {
    feature: "No Data Lock-in",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    cryptohopper: false,
  },
];

function Cell({ value }: { value: FeatureValue }) {
  if (typeof value === "string") {
    return <span>{value}</span>;
  }
  return value ? (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500/15 text-emerald-400">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M2 5l2.5 2.5L8 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  ) : (
    <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-[var(--glass-bg)] text-[var(--text-secondary)]">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
        <path
          d="M2 2l4 4M6 2L2 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function ComparisonTable() {
  return (
    <section id="comparison" className="px-6 py-24 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            Compare
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">
            Why pay for signals that{" "}
            <span className="text-emerald-400">should be free?</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-[var(--text-secondary)]">
            TradeClaw is the only open-source platform combining AI signals, a
            beautiful UI, and multi-asset support.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-6 py-4 text-left text-xs font-medium uppercase tracking-widest text-[var(--text-secondary)] w-[38%]">
                  Feature
                </th>
                <th className="px-4 py-4 text-center w-[15%]">
                  <div className="inline-flex flex-col items-center gap-1">
                    <span className="text-emerald-400 font-bold text-sm">
                      TradeClaw
                    </span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      Free
                    </span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-[var(--text-secondary)] font-medium w-[15%]">
                  <div className="flex flex-col items-center gap-1">
                    <span>TradingView</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">$60/mo</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-[var(--text-secondary)] font-medium w-[15%]">
                  <div className="flex flex-col items-center gap-1">
                    <span>3Commas</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">$49/mo</span>
                  </div>
                </th>
                <th className="px-4 py-4 text-center text-[var(--text-secondary)] font-medium w-[17%]">
                  <div className="flex flex-col items-center gap-1">
                    <span>Cryptohopper</span>
                    <span className="text-[10px] text-[var(--text-secondary)]">$107/mo</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={row.feature}
                  className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--glass-bg)] ${
                    i === ROWS.length - 1 ? "border-b-0" : ""
                  }`}
                >
                  <td className="px-6 py-3.5 text-[var(--foreground)]">{row.feature}</td>
                  <td className="px-4 py-3.5 text-center bg-emerald-500/[0.03]">
                    {typeof row.tradeclaw === "string" ? (
                      <span className="font-bold text-emerald-400">
                        {row.tradeclaw}
                      </span>
                    ) : (
                      <div className="flex justify-center">
                        <Cell value={row.tradeclaw} />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-[var(--text-secondary)]">
                    <div className="flex justify-center">
                      <Cell value={row.tradingview} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-[var(--text-secondary)]">
                    <div className="flex justify-center">
                      <Cell value={row.threecommas} />
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center text-[var(--text-secondary)]">
                    <div className="flex justify-center">
                      <Cell value={row.cryptohopper} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--text-secondary)]">
          Prices as of March 2026. Subject to change.
        </p>
      </div>
    </section>
  );
}
