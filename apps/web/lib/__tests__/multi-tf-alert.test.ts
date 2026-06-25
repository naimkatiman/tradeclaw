jest.mock('../telegram', () => ({
  sendMessage: jest.fn().mockResolvedValue(undefined),
}));

import fs from 'fs';
import os from 'os';
import path from 'path';
import { sendMessage } from '../telegram';
import {
  buildMultiTFAlertKey,
  formatMultiTFAlert,
  notifyMultiTFConfluence,
} from '../execution/multi-tf-alert';
import type { MultiTFResult } from '../../app/lib/signal-generator';

const mockedSendMessage = sendMessage as jest.MockedFunction<typeof sendMessage>;

function makeAlignedResult(overrides: Partial<MultiTFResult> = {}): MultiTFResult {
  return {
    symbol: 'BTCUSD',
    timeframes: [
      { timeframe: 'M15', direction: 'BUY', confidence: 82, buyScore: 1, sellScore: 0 },
      { timeframe: 'H1', direction: 'BUY', confidence: 84, buyScore: 2, sellScore: 0 },
      { timeframe: 'H4', direction: 'BUY', confidence: 81, buyScore: 1, sellScore: 0 },
      { timeframe: 'D1', direction: 'BUY', confidence: 78, buyScore: 1, sellScore: 0 },
    ],
    dominantDirection: 'BUY',
    agreementCount: 4,
    confluenceBonus: 15,
    isConflicted: false,
    entry: 106500,
    indicators: { trend: 'bullish' } as never,
    timestamp: '2026-05-21T00:00:00.000Z',
    source: 'real',
    ...overrides,
  };
}

describe('multi-tf confluence alert', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tradeclaw-mtf-'));
  const stateFile = path.join(tmpRoot, 'multi-tf-confluence-alerts.json');

  beforeEach(() => {
    mockedSendMessage.mockReset();
    mockedSendMessage.mockResolvedValue(undefined);
    fs.rmSync(stateFile, { force: true });
  });

  afterAll(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('formats a compact Telegram alert summary', () => {
    const text = formatMultiTFAlert([makeAlignedResult()], 'swing');
    expect(text).toContain('4-TF confluence alert');
    expect(text).toContain('Mode: <code>swing</code>');
    expect(text).toContain('Aligned signals: <b>1</b>');
    expect(text).toContain('BTCUSD');
  });

  it('builds a stable key for the aligned signal set', () => {
    const key = buildMultiTFAlertKey([makeAlignedResult()], 'swing');
    expect(key).toContain('swing:BTCUSD:BUY:BUYBUYBUYBUY:15');
  });

  it('sends once and then dedupes repeated aligned snapshots', async () => {
    const aligned = [makeAlignedResult()];

    const first = await notifyMultiTFConfluence(aligned, 'swing', {
      chatId: '12345',
      stateFile,
    });
    const second = await notifyMultiTFConfluence(aligned, 'swing', {
      chatId: '12345',
      stateFile,
    });

    expect(first).toMatchObject({ sent: true });
    expect(second).toMatchObject({ sent: false, skippedReason: 'duplicate' });
    expect(mockedSendMessage).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(stateFile)).toBe(true);
  });

  it('silently skips when there are no aligned signals', async () => {
    const result = await notifyMultiTFConfluence([
      makeAlignedResult({ agreementCount: 2 }),
    ], 'swing', { chatId: '12345', stateFile });

    expect(result).toEqual({
      sent: false,
      skippedReason: 'no_aligned_signals',
    });
    expect(mockedSendMessage).not.toHaveBeenCalled();
  });
});
