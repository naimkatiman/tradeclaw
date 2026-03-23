const comparisonData = [
  {
    feature: "AI Signals",
    tradeclaw: true,
    tradingview: false,
    threecommas: true,
    freqtrade: false,
  },
  {
    feature: "Multi-Asset (Forex + Crypto + Metals)",
    tradeclaw: true,
    tradingview: true,
    threecommas: false,
    freqtrade: true,
  },
  {
    feature: "Self-Hosted",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    freqtrade: true,
  },
  {
    feature: "Beautiful Dashboard",
    tradeclaw: true,
    tradingview: true,
    threecommas: true,
    freqtrade: false,
  },
  {
    feature: "Paper Trading",
    tradeclaw: true,
    tradingview: true,
    threecommas: true,
    freqtrade: true,
  },
  {
    feature: "Backtesting",
    tradeclaw: true,
    tradingview: true,
    threecommas: false,
    freqtrade: true,
  },
  {
    feature: "Telegram Alerts",
    tradeclaw: true,
    tradingview: false,
    threecommas: true,
    freqtrade: true,
  },
  {
    feature: "Free & Open Source",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    freqtrade: true,
  },
  {
    feature: "Docker One-Click",
    tradeclaw: true,
    tradingview: false,
    threecommas: false,
    freqtrade: true,
  },
];

export function ComparisonSection() {
  return (
    <section id="comparison" className="bg-[#0A0A0A] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            How TradeClaw{" "}
            <span className="text-emerald-400">stacks up</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
            The only open-source platform with AI signals + beautiful UI +
            multi-asset support.
          </p>
        </div>

        <div className="mt-12 overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-zinc-500 font-medium">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-emerald-400">
                  🐾 TradeClaw
                </th>
                <th className="px-4 py-3 text-center text-zinc-400 font-medium">
                  TradingView
                </th>
                <th className="px-4 py-3 text-center text-zinc-400 font-medium">
                  3Commas
                </th>
                <th className="px-4 py-3 text-center text-zinc-400 font-medium">
                  Freqtrade
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 text-zinc-300">{row.feature}</td>
                  <td className="px-4 py-3 text-center">
                    {row.tradeclaw ? "✅" : "❌"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.tradingview ? "✅" : "❌"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.threecommas ? "✅" : "❌"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.freqtrade ? "✅" : "❌"}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-white/10 bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-zinc-300">
                  Price
                </td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">
                  Free
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">
                  $60/mo
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">
                  $99/mo
                </td>
                <td className="px-4 py-3 text-center text-zinc-400">Free</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
