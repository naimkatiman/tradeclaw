import { CheckCircle2, XCircle, Footprints } from 'lucide-react';

export function ProblemSection() {
  return (
    <section className="bg-[#0d1117] px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            The{" "}
            <span className="text-red-400">$5,000/year</span> problem
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Every month, traders spend $200-500 on signal subscriptions,
            charting tools, and copy trading platforms that lock you out the
            moment you stop paying.
          </p>
        </div>

        <div className="mt-16 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-sm text-zinc-500">
                <th className="px-6 py-4 font-medium">Service</th>
                <th className="px-6 py-4 font-medium text-right">Monthly</th>
                <th className="px-6 py-4 font-medium text-right">Yearly</th>
                <th className="px-6 py-4 font-medium text-center">
                  You Own It?
                </th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <ComparisonRow
                name="TradingView Pro+"
                monthly="$60"
                yearly="$720"
                owned={false}
              />
              <ComparisonRow
                name="3Commas Pro"
                monthly="$99"
                yearly="$1,188"
                owned={false}
              />
              <ComparisonRow
                name="Signal Groups (Telegram)"
                monthly="$200"
                yearly="$2,400"
                owned={false}
              />
              <ComparisonRow
                name="Copy Trading (15-50% cut)"
                monthly="$150+"
                yearly="$1,800+"
                owned={false}
              />
              <tr className="border-t-2 border-emerald-500/30 bg-emerald-500/5">
                <td className="px-6 py-4 font-semibold text-emerald-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Footprints className="h-4 w-4" /> TradeClaw
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-bold text-emerald-400">
                  $0
                </td>
                <td className="px-6 py-4 text-right font-bold text-emerald-400">
                  $0
                </td>
                <td className="px-6 py-4 text-center">
                  <CheckCircle2 className="inline h-5 w-5 text-emerald-400" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Your server. Your data. Your strategies.{" "}
          <span className="text-emerald-400 font-medium">Forever.</span>
        </p>
      </div>
    </section>
  );
}

function ComparisonRow({
  name,
  monthly,
  yearly,
  owned,
}: {
  name: string;
  monthly: string;
  yearly: string;
  owned: boolean;
}) {
  return (
    <tr className="border-b border-white/5 text-zinc-300">
      <td className="px-6 py-4">{name}</td>
      <td className="px-6 py-4 text-right text-zinc-400">{monthly}</td>
      <td className="px-6 py-4 text-right text-zinc-400">{yearly}</td>
      <td className="px-6 py-4 text-center">
        {owned
          ? <CheckCircle2 className="inline h-5 w-5 text-emerald-400" />
          : <XCircle className="inline h-5 w-5 text-red-400" />
        }
      </td>
    </tr>
  );
}
