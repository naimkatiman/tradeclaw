import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readmeSection(start: string, end: string): string {
  const readme = readFileSync(resolve(__dirname, '../../../../README.md'), 'utf8');
  const startIndex = readme.indexOf(start);
  const endIndex = readme.indexOf(end, startIndex + start.length);

  if (startIndex === -1 || endIndex === -1) {
    throw new Error(`README section boundary missing: ${start} -> ${end}`);
  }

  return readme.slice(startIndex, endIndex);
}

describe('README systematic-research intake discoverability', () => {
  it('frames the complete pinned intake separately from TradeClaw evidence', () => {
    const research = readmeSection('## Research status', '## Quick start');

    expect(research).toMatch(/pinned 61-candidate intake/i);
    expect(research).toContain('https://github.com/paperswithbacktest/awesome-systematic-trading');
    expect(research).toMatch(/original source order/i);
    expect(research).toMatch(
      /upstream figures[\s\S]*gross discovery metadata[\s\S]*not TradeClaw performance/i,
    );
    expect(research).toMatch(
      /50 untouched discoveries[\s\S]*7 source-audit no-go records[\s\S]*1 QA-only INCONCLUSIVE replication[\s\S]*3 cost- or stability-failed replications/i,
    );
    expect(research).toMatch(/source-audit no-go records[\s\S]*not local performance failures/i);
    expect(research).toMatch(/grants neither publication nor trading authority/i);
    expect(research).toMatch(/retained TradeClaw study ledger/i);
  });

  it('provides a copy-paste no-key endpoint and canonical exploration links', () => {
    const api = readmeSection('## API', '## Notifications');

    expect(api).toMatch(/No key required on the public research routes/i);
    expect(api).toMatch(
      /resources[\s\S]*links\.candidate[\s\S]*plainLanguageSummary[\s\S]*same classifier counts/i,
    );
    expect(api).toMatch(/convenience copy, not evidence or authority/i);
    expect(api).toContain("curl https://tradeclaw.win/api/research/intake");
    expect(api).toMatch(
      /all 61 pinned discovery candidates[\s\S]*completed TradeClaw evidence overlays/i,
    );
    expect(api).toContain('curl https://tradeclaw.win/api/research/intake/evidence');
    expect(api).toMatch(
      /all examined candidates[\s\S]*failures[\s\S]*no-go audits[\s\S]*inconclusive/i,
    );
    expect(api).toContain(
      'curl https://tradeclaw.win/api/research/intake/evidence.csv -o tradeclaw-systematic-research-evidence-2026-08-30.csv',
    );
    expect(api).toMatch(
      /complete examined-candidate evidence spreadsheet[\s\S]*failures[\s\S]*no-go audits[\s\S]*inconclusive/i,
    );
    expect(api).not.toMatch(/all (?:ten|eleven|\d+) examined candidates/i);
    expect(api).not.toMatch(/(?:ten|eleven|\d+)-row evidence spreadsheet/i);
    expect(api).toContain(
      'curl https://tradeclaw.win/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation',
    );
    expect(api).toMatch(/one canonical candidate[\s\S]*complete safe evidence overlay/i);
    expect(api).toContain(
      'curl https://tradeclaw.win/api/research/intake.csv -o tradeclaw-systematic-research-intake-2026-08-29.csv',
    );
    expect(api).toMatch(/25-column spreadsheet index[\s\S]*canonical JSON/i);
    expect(api).toContain('[research verdict board](https://tradeclaw.win/research)');
    expect(api).toContain('[open data](https://tradeclaw.win/open-data)');
    expect(api).toContain('[API docs](https://tradeclaw.win/api-docs)');
  });
});
