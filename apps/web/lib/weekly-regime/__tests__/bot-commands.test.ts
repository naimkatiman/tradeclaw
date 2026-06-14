/**
 * Tests for the Weekly Regime Telegram bot command handlers.
 *
 * The real `./parser` is owned by another layer and may not be on disk yet, so
 * it is virtual-mocked here — the bot commands honor the contract by importing
 * `parseAdminNote` from `./parser`; the test controls what it returns.
 *
 * The read handler is exercised with an INJECTED fetcher, so no DB is touched.
 */

import type { RegimeInput, WeeklyRegimeCard } from '../types';
import { ASSET_CLASSES } from '../types';

// Virtual-mock the parser so the clarify path is deterministic and the suite
// does not depend on parser.ts existing in this worktree.
const mockParseAdminNote = jest.fn();
jest.mock(
  '../parser',
  () => ({
    parseAdminNote: (text: string) => mockParseAdminNote(text),
  }),
  { virtual: true },
);

// Keep the service inert: these tests never write, but importing the module
// must not require a DB. The handlers under test either return before calling
// the service (non-admin / clarify) or take an injected fetcher.
jest.mock('../service', () => ({
  setWeeklyRegime: jest.fn(),
  getCurrentWeeklyRegime: jest.fn(),
}));

import {
  isAdminTelegramUser,
  handleSetRegime,
  handleShowRegime,
} from '../bot-commands';

const ORIGINAL_ENV = process.env.ADMIN_TELEGRAM_IDS;

afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.ADMIN_TELEGRAM_IDS;
  } else {
    process.env.ADMIN_TELEGRAM_IDS = ORIGINAL_ENV;
  }
  jest.clearAllMocks();
});

function fullInput(partial: Partial<RegimeInput>): RegimeInput {
  const base = {} as RegimeInput;
  for (const cls of ASSET_CLASSES) {
    base[cls] = { bias: 'NONE', conviction: 0, thesis: '' };
  }
  return { ...base, ...partial };
}

describe('isAdminTelegramUser', () => {
  it('denies everyone when ADMIN_TELEGRAM_IDS is unset', () => {
    delete process.env.ADMIN_TELEGRAM_IDS;
    expect(isAdminTelegramUser(123)).toBe(false);
  });

  it('denies everyone when ADMIN_TELEGRAM_IDS is empty', () => {
    process.env.ADMIN_TELEGRAM_IDS = '   ';
    expect(isAdminTelegramUser(123)).toBe(false);
  });

  it('allows an id present in the comma-separated allowlist', () => {
    process.env.ADMIN_TELEGRAM_IDS = '999, 123 ,456';
    expect(isAdminTelegramUser(123)).toBe(true);
    expect(isAdminTelegramUser(456)).toBe(true);
    expect(isAdminTelegramUser(999)).toBe(true);
  });

  it('denies an id not in the allowlist', () => {
    process.env.ADMIN_TELEGRAM_IDS = '999,456';
    expect(isAdminTelegramUser(123)).toBe(false);
  });
});

describe('handleSetRegime', () => {
  it('rejects a non-admin user without parsing', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '999';
    const { reply } = await handleSetRegime({
      text: '/setregime crypto long strong',
      telegramUserId: 123,
    });
    expect(reply).toBe('You are not authorized to set the weekly regime.');
    expect(mockParseAdminNote).not.toHaveBeenCalled();
  });

  it('returns the parser clarifying question on an ambiguous note', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '123';
    mockParseAdminNote.mockReturnValue({
      ok: false,
      clarify: 'Did you mean crypto LONG or SHORT?',
    });

    const { reply } = await handleSetRegime({
      text: '/setregime crypto up down',
      telegramUserId: 123,
    });

    expect(mockParseAdminNote).toHaveBeenCalledWith('crypto up down');
    expect(reply).toBe('Did you mean crypto LONG or SHORT?');
  });

  it('replies a preview with the confirm/redo line on a parseable note', async () => {
    process.env.ADMIN_TELEGRAM_IDS = '123';
    mockParseAdminNote.mockReturnValue({
      ok: true,
      input: fullInput({
        crypto: { bias: 'LONG', conviction: 3, thesis: 'BTC breakout' },
      }),
    });

    // Tuesday 2026-06-02 (KL week starting Monday 2026-06-01).
    const now = new Date('2026-06-02T02:00:00.000Z');
    const { reply } = await handleSetRegime({
      text: '/setregime crypto long strong',
      telegramUserId: 123,
      now,
    });

    expect(reply).toContain('week of 2026-06-01');
    expect(reply).toContain('Crypto: TRENDING (LONG c3)');
    expect(reply).toContain('BTC breakout');
    // untouched class derives NEUTRAL
    expect(reply).toContain('Stocks: NEUTRAL (NONE c0)');
    expect(reply).toContain('Send /confirmregime to write, or /setregime <new note> to redo.');
  });
});

describe('handleShowRegime', () => {
  it('formats an injected card across all five classes', async () => {
    const card: WeeklyRegimeCard = {
      week_start: '2026-06-01',
      classes: {
        crypto: {
          bias: 'LONG',
          conviction: 3,
          regime: 'TRENDING',
          thesis: 'BTC breakout',
          set_by: 'tg:123',
          set_at: '2026-06-01T03:00:00.000Z',
        },
        commodities: {
          bias: 'SHORT',
          conviction: 2,
          regime: 'TRENDING',
          thesis: 'gold rollover',
          set_by: 'tg:123',
          set_at: '2026-06-01T03:00:00.000Z',
        },
        stocks: {
          bias: 'NONE',
          conviction: 0,
          regime: 'NEUTRAL',
          thesis: '',
          set_by: 'tg:123',
          set_at: '2026-06-01T03:00:00.000Z',
        },
        forex: {
          bias: 'NONE',
          conviction: 0,
          regime: 'NEUTRAL',
          thesis: '',
          set_by: 'tg:123',
          set_at: '2026-06-01T03:00:00.000Z',
        },
        indices: {
          bias: 'LONG',
          conviction: 1,
          regime: 'TRENDING',
          thesis: 'spx grind',
          set_by: 'tg:123',
          set_at: '2026-06-01T03:00:00.000Z',
        },
      },
      locked: false,
      override_used: false,
      override_reason: null,
      set_by: 'tg:123',
      set_at: '2026-06-01T03:00:00.000Z',
    };

    const { reply } = await handleShowRegime(async () => card);

    expect(reply).toContain('Weekly Regime (week of 2026-06-01):');
    expect(reply).toContain('Crypto: TRENDING (LONG c3) - BTC breakout');
    expect(reply).toContain('Commodities: TRENDING (SHORT c2) - gold rollover');
    expect(reply).toContain('Stocks: NEUTRAL (NONE c0)');
    expect(reply).toContain('Forex: NEUTRAL (NONE c0)');
    expect(reply).toContain('Indices: TRENDING (LONG c1) - spx grind');
  });

  it('reports an empty week when the fetcher returns null', async () => {
    const { reply } = await handleShowRegime(async () => null);
    expect(reply).toBe('No regime card set for this week yet.');
  });
});
