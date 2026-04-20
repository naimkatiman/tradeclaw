import { SampleTelegramCard } from './sample-telegram-card';

interface DelayDemoSignal {
  symbol: string;
  direction: 'BUY' | 'SELL';
  entry: number;
  tp1: number | null;
  sl: number | null;
  createdAt: string;
}

interface DelayDemoProps {
  pro: DelayDemoSignal;
  free: DelayDemoSignal;
}

function formatClock(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss} UTC`;
}

export function DelayDemo({ pro, free }: DelayDemoProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SampleTelegramCard
        tier="pro"
        symbol={pro.symbol}
        direction={pro.direction}
        entry={pro.entry}
        tp1={pro.tp1}
        sl={pro.sl}
        timestampLabel={formatClock(pro.createdAt)}
      />
      <SampleTelegramCard
        tier="free"
        symbol={free.symbol}
        direction={free.direction}
        entry={free.entry}
        tp1={free.tp1}
        timestampLabel={formatClock(free.createdAt)}
        delayLabel="Delivered 15 minutes after the Pro alert"
      />
    </div>
  );
}
