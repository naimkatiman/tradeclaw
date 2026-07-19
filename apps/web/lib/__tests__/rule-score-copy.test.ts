import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STAT_HINTS } from '../stat-hints';
import { getDashboardTranslations } from '../product-i18n/dashboard';
import { getScreenerTranslations } from '../product-i18n/screener';
import { HIGH_CONFIDENCE_THRESHOLD, isHighRuleScore } from '../signal-thresholds';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, relativePath), 'utf8');
}

describe('raw signal score truth labels', () => {
  it('defines the engine score as mechanical indicator agreement, not probability', () => {
    expect(STAT_HINTS.avgConfidence).toMatch(/mechanical rule\/confluence score/i);
    expect(STAT_HINTS.avgConfidence).toMatch(/not a probability/i);
    expect(STAT_HINTS.avgConfidence).toMatch(/not .*demonstrated trading edge/i);
  });

  it('does not fill incomplete live records with plausible-looking values', () => {
    const live = read('../../app/live/LiveClient.tsx');

    expect(live).toContain("fetch('/api/live-feed', { cache: 'no-store' })");
    expect(live).toContain("raw.dataQuality !== 'real'");
    expect(live).toContain('return null');
    expect(live).not.toContain("?? 'BTCUSD'");
    expect(live).not.toContain("?? 'HOLD'");
    expect(live).not.toContain(': 75;');
    expect(live).not.toContain("?? 'H1'");
  });

  it('presents the raw score without a probability percent sign on core research views', () => {
    const dashboard = read('../../app/dashboard/DashboardClient.tsx');
    const screener = read('../../app/screener/ScreenerClient.tsx');
    const accuracy = read('../../app/accuracy/AccuracyClient.tsx');
    const leaderboard = read('../../app/leaderboard/LeaderboardClient.tsx');
    const signalDetail = read('../../app/signal/[id]/page.tsx');
    const embed = read('../../app/embed/[pair]/EmbedCard.tsx');
    const outcomeCard = read('../../app/components/signal-outcome-card.tsx');
    const liveDemo = read('../../components/landing/live-demo-section.tsx');
    const demo = read('../../app/demo/DemoClient.tsx');

    expect(JSON.stringify(getDashboardTranslations('en'))).toMatch(/rule score/i);
    expect(JSON.stringify(getScreenerTranslations('en'))).toMatch(/rule score/i);

    for (const source of [accuracy, leaderboard]) {
      expect(source).toMatch(/rule score/i);
    }

    for (const source of [dashboard, screener, accuracy, leaderboard, signalDetail, embed, outcomeCard, liveDemo, demo]) {
      expect(source).not.toMatch(/>\s*\{(?:signal|sig|r|topSignal)\.confidence\}%\s*</);
    }

    for (const source of [signalDetail, embed, outcomeCard]) {
      expect(source).not.toMatch(/>\s*confidence:?\s*</i);
      expect(source).toMatch(/rule score/i);
    }
  });

  it('uses an inclusive canonical high-score boundary', () => {
    expect(isHighRuleScore(79)).toBe(false);
    expect(isHighRuleScore(80)).toBe(true);
    expect(isHighRuleScore(81)).toBe(true);
    for (const locale of ['en', 'es', 'zh', 'ms', 'ar'] as const) {
      expect(getDashboardTranslations(locale).filters.highRuleScore).toContain(
        `≥${HIGH_CONFIDENCE_THRESHOLD}/100`,
      );
    }
  });
});
