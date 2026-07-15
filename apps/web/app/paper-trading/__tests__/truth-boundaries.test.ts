import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('paper trading page truth boundaries', () => {
  it('fails closed when the authenticated portfolio is unavailable', () => {
    const source = readFileSync(resolve(__dirname, '../page.tsx'), 'utf8');

    expect(source).toContain("type PortfolioStatus = 'loading' | 'ready' | 'unauthenticated' | 'unavailable'");
    expect(source).toContain("res.status === 401 ? 'unauthenticated' : 'unavailable'");
    expect(source).toContain("portfolioStatus !== 'ready'");
    expect(source).toContain('if (!response.ok) throw new Error(await responseError(response))');
    expect(source).not.toMatch(/portfolio\?\.balance \?\? 10000|portfolio\?\.startingBalance \?\? 10000/);
  });
});
