import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');
}

describe('active public claim copy', () => {
  it('does not promise perpetual cost or fixed deployment timing in global copy', () => {
    const globalCopy = `${source('app/layout.tsx')}\n${source('lib/translations.ts')}`;

    expect(globalCopy).not.toMatch(/free forever/i);
    expect(globalCopy).not.toMatch(/deploy in (?:5 )?min/i);
    expect(globalCopy).not.toMatch(/5-minute cadence/i);
    expect(globalCopy).not.toContain('Gratis para siempre');
    expect(globalCopy).not.toContain('永久免费');
    expect(globalCopy).not.toContain('Percuma selamanya');
    expect(globalCopy).not.toContain('مجانية إلى الأبد');
    expect(globalCopy).toContain('Hosting, market-data providers, brokers, and notification services may charge');
  });

  it('fails GitHub social proof closed and describes thresholds as proposals', () => {
    const star = source('app/star/StarClient.tsx');
    const milestone = source('components/milestone-modal.tsx');

    expect(star).not.toContain('setStars(1)');
    expect(star).toContain('if (!r.ok) throw new Error("GitHub metric unavailable")');
    expect(star).toContain('campaign prompts, not delivery commitments');
    expect(star).not.toContain('thousands of new users');
    expect(milestone).toContain("if (!r.ok) throw new Error('GitHub metric unavailable')");
    expect(milestone).not.toContain('Join thousands of traders');
  });

  it('labels delivery, feed, and conversion boundaries explicitly', () => {
    const sms = source('app/sms/SmsClient.tsx');
    const rss = source('app/rss/RSSClient.tsx');
    const feed = source('app/feed.xml/route.ts');
    const pine = source('app/pine-to-tradeclaw/PineImportClient.tsx');

    expect(sms).toContain('Delivery is not guaranteed by TradeClaw');
    expect(sms).toContain('Timing depends on Twilio and carriers');
    expect(rss).toContain('indicator agreement');
    expect(feed).toContain('not broker fills');
    expect(pine).toContain('semantic equivalence is not guaranteed');
  });

  it('keeps residual calls to action evidence-bounded', () => {
    expect(source('app/compare/CompareClient.tsx')).toContain('Review the TradeClaw self-hosting path');
    expect(source('app/open-data/page.tsx')).toContain('Public evidence archive');
    expect(source('app/docs/DocsClient.tsx')).toContain('not a calibrated probability of profit');
    expect(source('app/producthunt/PHClient.tsx')).toContain('Verify product behavior, evidence, costs, and external links');
  });
});
