import { applySlippage, getSlippageConfig } from './slippage';
import type { SlippageConfig } from './slippage';

describe('getSlippageConfig', () => {
  test('returns crypto config for BTCUSD', () => {
    const config = getSlippageConfig('BTCUSD');
    expect(config.pctEntry).toBe(0.15);
    expect(config.enabled).toBe(true);
  });

  test('returns metals config for XAUUSD', () => {
    const config = getSlippageConfig('XAUUSD');
    expect(config.pctEntry).toBe(0.05);
  });

  test('returns forex config for EURUSD', () => {
    const config = getSlippageConfig('EURUSD');
    expect(config.pctEntry).toBe(0.02);
  });

  test('crypto has higher slippage than forex', () => {
    const crypto = getSlippageConfig('ETHUSD');
    const forex = getSlippageConfig('GBPUSD');
    expect(crypto.pctEntry).toBeGreaterThan(forex.pctEntry);
  });
});

describe('applySlippage', () => {
  const config: SlippageConfig = { enabled: true, pctEntry: 0.15, pctExit: 0.15 };

  test('BUY entry slippage increases price', () => {
    const result = applySlippage(1000, 'BUY', 'entry', config);
    expect(result).toBeGreaterThan(1000);
    expect(result).toBeCloseTo(1001.5, 1);
  });

  test('SELL entry slippage decreases price', () => {
    const result = applySlippage(1000, 'SELL', 'entry', config);
    expect(result).toBeLessThan(1000);
    expect(result).toBeCloseTo(998.5, 1);
  });

  test('BUY exit slippage decreases price (works against trader)', () => {
    const result = applySlippage(1000, 'BUY', 'exit', config);
    expect(result).toBeLessThan(1000);
  });

  test('SELL exit slippage increases price (works against trader)', () => {
    const result = applySlippage(1000, 'SELL', 'exit', config);
    expect(result).toBeGreaterThan(1000);
  });

  test('disabled slippage returns exact price', () => {
    const disabled: SlippageConfig = { enabled: false, pctEntry: 0.15, pctExit: 0.15 };
    expect(applySlippage(1000, 'BUY', 'entry', disabled)).toBe(1000);
    expect(applySlippage(1000, 'SELL', 'exit', disabled)).toBe(1000);
  });

  test('round-trip slippage reduces net PnL', () => {
    // Simulate BUY at 1000, close at 1000 (no price move)
    const entry = applySlippage(1000, 'BUY', 'entry', config);
    const exit = applySlippage(1000, 'BUY', 'exit', config);
    // Trader bought higher, sold lower = loss
    expect(exit - entry).toBeLessThan(0);
  });
});
