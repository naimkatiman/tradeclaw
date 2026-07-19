import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ARTIFACT_FILE =
  'slow-gate-BTCUSD_ETHUSD-D1-2017-09-01-2026-07-16-f4.json';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../../../..', relativePath), 'utf8');
}

describe('slow-gate open-data contract', () => {
  it('links the committed artifact with explicit sandbox and execution-model boundaries', () => {
    const page = read('apps/web/app/open-data/page.tsx');
    const artifact = JSON.parse(
      read(`docs/research/experiments/${ARTIFACT_FILE}`),
    ) as {
      spec: { variants: string[]; caveats: string[] };
      portfolio: Record<
        string,
        {
          metrics: {
            cagr: number;
            maxDrawdown: number;
            calmar: number;
            sharpe: number;
          };
        }
      >;
    };

    expect(page).toContain(`file: '${ARTIFACT_FILE}'`);
    expect(page).toContain(
      "const REPO_BLOB = 'https://github.com/naimkatiman/tradeclaw/blob/main/docs/research/experiments';",
    );
    expect(page).toContain('href={`${REPO_BLOB}/${a.file}`}');
    expect(page).toContain("labels: ['sandbox only', 'non-live', 'modeled backtest', 'no broker fills', 'informational only']");
    expect(page).toContain('The 50/50 vol-targeted portfolio trailed buy-and-hold CAGR (22.75% vs 28.09%)');
    expect(page).toContain('improved modeled Calmar (0.61 vs 0.32) and max drawdown (37.42% vs 86.49%)');
    expect(page).toContain('EMA200 had isolated raw-CAGR wins');
    expect(page).toContain('does not represent broker fills');

    expect(artifact.spec.variants).toEqual(
      expect.arrayContaining(['buy-hold', 'ema200-hmm', 'ema200-vol']),
    );
    expect(artifact.spec.caveats.join(' ')).toMatch(/SANDBOX study/i);
    expect(artifact.spec.caveats.join(' ')).toMatch(/does not activate anything live/i);
    expect(artifact.portfolio['ema200-vol'].metrics.cagr).toBeLessThan(
      artifact.portfolio['buy-hold'].metrics.cagr,
    );
    // Prevent the public copy from drifting back to the overbroad claim that
    // no active variant ever won on raw return.
    expect(artifact.portfolio.ema200.metrics.cagr).toBeGreaterThan(
      artifact.portfolio['buy-hold'].metrics.cagr,
    );
    expect(artifact.portfolio['ema200-vol'].metrics.calmar).toBeGreaterThan(
      artifact.portfolio['buy-hold'].metrics.calmar,
    );
    expect(artifact.portfolio['ema200-hmm'].metrics.calmar).toBeLessThan(
      artifact.portfolio['buy-hold'].metrics.calmar,
    );
    expect(artifact.portfolio['ema200-hmm'].metrics).toMatchObject({
      cagr: 0.10777641978089836,
      maxDrawdown: 0.5018751015953067,
      calmar: 0.21474749282901312,
      sharpe: 0.4795370617347671,
    });
  });
});
