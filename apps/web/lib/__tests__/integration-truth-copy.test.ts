import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(relativePath: string): string {
  return readFileSync(resolve(__dirname, '../..', relativePath), 'utf8');
}

describe('integration and delivery truth labels', () => {
  it('labels broker cards as external examples and states the native boundary', () => {
    const brokers = source('app/brokers/BrokersClient.tsx');
    const simulator = source('app/broker-sim/BrokerSimClient.tsx');

    expect(brokers).toContain('1 native executor');
    expect(brokers).toContain('external API starter examples');
    expect(brokers).toContain('Execution off by default');
    expect(brokers).toContain('costAdjustedEvidence.netExpectancyR > 0');
    expect(brokers).toContain('acceptedForReview: true, executed: false');
    expect(brokers).not.toContain('if (confidence >= 75');
    expect(brokers).not.toContain('Supports 8+ brokers');
    expect(brokers).not.toContain('Supported Brokers &amp; Exchanges');
    expect(simulator).toContain('This example only logs candidates');
    expect(simulator).toContain('executed: false');
    expect(simulator).not.toContain('broker.placeOrder');
    expect(simulator).not.toContain('Auto-follow signals');
  });

  it('presents the legacy confidence field as an uncalibrated rule score', () => {
    const openapi = source('lib/openapi.ts');
    const telegram = source('app/api/demo/telegram/route.ts');
    const slack = source('app/slack/SlackClient.tsx');
    const operator = source('app/admin/operator/page.tsx');
    const developer = source('app/developer/DeveloperClient.tsx');
    const gamePlans = source('lib/game-plans.ts');

    expect(openapi).toContain("mechanical rule/confluence score");
    expect(openapi).toContain('not a calibrated probability');
    expect(telegram).toContain('*Rule score:*');
    expect(telegram).not.toContain('*Confidence:*');
    expect(slack).toContain('rule score 82/100');
    expect(slack).not.toContain('% confidence');
    expect(operator).toContain('Avg Rule Score');
    expect(developer).toContain('mechanical score out of 100');
    expect(gamePlans).toContain('top rule score');
    expect(gamePlans).not.toContain('% confidence');
  });

  it('does not present the educational confidence score as a delivery trigger', () => {
    const confidence = source('app/confidence/ConfidenceClient.tsx');

    expect(confidence).toMatch(/This score does not trigger publication,\s+alert delivery, or broker\s+execution\./);
    expect(confidence).not.toContain('Auto-broadcast to Telegram & webhooks');
    expect(confidence).not.toContain('auto-broadcast');
  });

  it('keeps Slack and Zapier setup claims within the implemented dispatch boundary', () => {
    const slack = source('app/slack/SlackClient.tsx');
    const zapier = source('app/zapier/ZapierClient.tsx');

    expect(slack).toMatch(/not\s+wired to the automatic signal cron/);
    expect(slack).not.toContain('fired on the 5-minute signal cron');
    expect(zapier).toMatch(/not a native Zapier app/);
    expect(zapier).not.toContain('fires a webhook every time a signal is generated');
    expect(zapier).not.toContain('on every signal');
  });

  it('presents marketplace entries as recipes without fake verification', () => {
    const marketplace = source('components/marketplace-client.tsx');
    const catalogRoute = source('app/api/marketplace/route.ts');

    expect(marketplace).toContain('Manual recipe; no native app installation');
    expect(marketplace).not.toContain('Connection verified');
    expect(marketplace).not.toContain('setTimeout(() => setTested');
    expect(catalogRoute).toMatch(/catalogType:\s*['"]manual-setup-recipes['"]/);
    expect(catalogRoute).not.toContain('webhookDispatchUrl');
  });

  it('labels showcase personas and weekly results as examples and signal research', () => {
    const showcase = source('components/showcase/ShowcaseClient.tsx');
    const weekly = source('app/weekly/page.tsx');

    expect(showcase).toContain('Illustrative workflows, not testimonials');
    expect(showcase).not.toContain('Live traders using TradeClaw right now');
    expect(showcase).not.toContain('Actually Using');
    expect(weekly).toContain('not broker fills, customer trades, or portfolio P/L');
  });

  it('does not retain fabricated provider or contributor fallbacks', () => {
    const providers = source('lib/marketplace-providers.ts');
    const contributors = source('app/api/github/contributors/route.ts');

    expect(providers).not.toContain('SEED_PROVIDERS');
    expect(contributors).toContain('available: false');
    expect(contributors).not.toContain('const SEED');
    expect(contributors).not.toContain('mergedPrs');
    expect(contributors).not.toContain('issuesClosed');
  });

  it('does not publish unmeasured comparison benchmarks or catalog parity claims', () => {
    const compare = source('app/compare/CompareClient.tsx');

    expect(compare).toContain('No published latency benchmark');
    expect(compare).toContain('No performance parity is claimed');
    expect(compare).toContain('RSI, MACD, EMA, Bollinger Bands, Stochastic, ADX, and Volume');
    expect(compare).not.toContain('BENCHMARKS');
    expect(compare).not.toContain('42 ms');
    expect(compare).not.toContain('TA-Lib-level performance');
    expect(compare).not.toContain('130+ indicators');
    expect(compare).not.toContain('the only open-source');
  });

  it('does not invent uptime for the sponsor page', () => {
    const sponsor = source('app/sponsor/SponsorClient.tsx');
    const legacyRoute = source('app/sponsor/page.tsx');

    expect(sponsor).toContain("{ label: 'Hosted uptime', value: 'Not measured'");
    expect(sponsor).toContain('No durable uptime or SLA monitor is connected');
    expect(sponsor).not.toContain('99.9%');
    expect(legacyRoute).toContain("redirect('/sponsors')");
    expect(legacyRoute).not.toContain('SponsorClient');
  });

  it('hands guidance requests to GitHub without pretending a local form was submitted', () => {
    const contribute = source('app/contribute/ContributeClient.tsx');
    const contributeMetadata = source('app/contribute/page.tsx');

    expect(contribute).toContain('Nothing is submitted or stored by this page');
    expect(contribute).toContain('window.location.assign(`${REPO_URL}/issues/new?${params.toString()}`)');
    expect(contribute).toContain('No issue records are substituted');
    expect(contribute).not.toContain('FALLBACK_ISSUES');
    expect(contribute).not.toContain('tradeclaw_mentorship_submitted');
    expect(contribute).not.toContain('Application received!');
    expect(contribute).not.toContain('within 48 hours');
    expect(contribute).not.toContain('the first open-source');
    expect(contributeMetadata).not.toContain('the first open-source');
    expect(contributeMetadata).not.toContain('mentorship');
  });
});
