import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(__dirname, '../..', path), 'utf8');
}

describe('public onboarding copy', () => {
  it('documents runnable setup without fixed timing or signal-delivery promises', () => {
    const start = source('app/start/StartClient.tsx');

    expect(start).not.toContain('@naimkatiman/tradeclaw-demo');
    expect(start).not.toContain('under 5 minutes');
    expect(start).not.toContain('in 60 seconds');
    expect(start).not.toContain('Signals update every 5 minutes');
    expect(start).not.toContain('Live BUY/SELL signals');
    expect(start).not.toContain('estimatedTime');
    expect(start).not.toContain('useState(4)');
    expect(start).not.toContain('?pair=BTCUSD');

    expect(start).toContain('cp .env.example .env');
    expect(start).toContain('docker compose up -d --build');
    expect(start).toContain('?symbol=BTCUSD&timeframe=H1');
    expect(start).toContain('nominal five-minute interval');
    expect(start).toMatch(/Signal freshness is not\s+guaranteed/);
    expect(start).toMatch(/modeled backtest results are not live trading performance/i);
  });

  it('offers copy only for a verified external listing and keeps the draft evidence-bounded', () => {
    const awesome = source('app/awesome/AwesomeClient.tsx');

    expect(awesome).not.toContain('je-suis-tm/quant-trading');
    expect(awesome).not.toContain('drives thousands');
    expect(awesome).not.toContain('drives massive organic discovery');
    expect(awesome).not.toContain('5-minute live signals');
    expect(awesome).not.toContain('Real AI signals');
    expect(awesome).not.toContain('meets them all');
    expect(awesome).not.toContain('takes under 2 minutes');

    expect(awesome).toContain("name: 'awesome-quant'");
    expect(awesome).toContain("status: 'Listed'");
    expect(awesome).toContain("status: 'Review required'");
    expect(awesome.match(/copyText:/g)).toHaveLength(1);
    expect(awesome).toContain('observed OHLCV when available');
    expect(awesome).toContain('modeled historical backtests with explicit cost and exit assumptions');
    expect(awesome).toContain('No copyable entry until upstream fit and contribution rules are verified');
  });
});
