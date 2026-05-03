import {
  WINNING_CELLS,
  WINNING_CELLS_GATE_REASON,
  isWinningCell,
  getWinningCellsMode,
} from '../winning-cells';

describe('winning-cells — config invariants', () => {
  it('contains exactly the 6 cells the 30-day backtest identified', () => {
    expect(WINNING_CELLS).toHaveLength(6);
    const keys = new Set(WINNING_CELLS.map((c) => `${c.pair}:${c.direction}`));
    expect(keys).toEqual(
      new Set([
        'XAUUSD:BUY',
        'XAGUSD:BUY',
        'USDJPY:SELL',
        'AUDUSD:BUY',
        'BTCUSD:BUY',
        'DOGEUSD:BUY',
      ]),
    );
  });

  it('every cell has a documented backtest WR > 50% (publishing only winners)', () => {
    for (const cell of WINNING_CELLS) {
      expect(cell.backtestWinRate).toBeGreaterThan(50);
    }
  });

  it('every cell has positive backtest expectancy', () => {
    for (const cell of WINNING_CELLS) {
      expect(cell.backtestAvgPnl).toBeGreaterThan(0);
    }
  });

  it('exposes a stable gate_reason string for signal_history rows', () => {
    expect(WINNING_CELLS_GATE_REASON).toBe('not_in_winning_cells');
  });
});

describe('isWinningCell — membership checks', () => {
  it('admits each canonical cell', () => {
    expect(isWinningCell('XAUUSD', 'BUY')).toBe(true);
    expect(isWinningCell('XAGUSD', 'BUY')).toBe(true);
    expect(isWinningCell('USDJPY', 'SELL')).toBe(true);
    expect(isWinningCell('AUDUSD', 'BUY')).toBe(true);
    expect(isWinningCell('BTCUSD', 'BUY')).toBe(true);
    expect(isWinningCell('DOGEUSD', 'BUY')).toBe(true);
  });

  it('rejects opposite direction on a winning pair', () => {
    expect(isWinningCell('XAUUSD', 'SELL')).toBe(false);
    expect(isWinningCell('USDJPY', 'BUY')).toBe(false);
    expect(isWinningCell('AUDUSD', 'SELL')).toBe(false);
  });

  it('rejects pairs that the backtest classified as catastrophic losers', () => {
    // The 30-day backtest flagged these as <20% WR — they must never
    // accidentally pass the gate even if the symbol shows up.
    expect(isWinningCell('USDCAD', 'BUY')).toBe(false);
    expect(isWinningCell('EURUSD', 'SELL')).toBe(false);
    expect(isWinningCell('USDCHF', 'BUY')).toBe(false);
    expect(isWinningCell('GBPUSD', 'SELL')).toBe(false);
  });

  it('rejects unknown pairs', () => {
    expect(isWinningCell('UNKNOWNUSD', 'BUY')).toBe(false);
  });

  it('is case-insensitive on pair input', () => {
    expect(isWinningCell('xauusd', 'BUY')).toBe(true);
    expect(isWinningCell('XaUuSd', 'BUY')).toBe(true);
  });
});

describe('getWinningCellsMode — env resolution', () => {
  const ORIGINAL = process.env.WINNING_CELLS_MODE;

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.WINNING_CELLS_MODE;
    else process.env.WINNING_CELLS_MODE = ORIGINAL;
  });

  it('defaults to shadow when env is unset (safe default for fresh deploys)', () => {
    delete process.env.WINNING_CELLS_MODE;
    expect(getWinningCellsMode()).toBe('shadow');
  });

  it('honors active', () => {
    process.env.WINNING_CELLS_MODE = 'active';
    expect(getWinningCellsMode()).toBe('active');
  });

  it('honors off', () => {
    process.env.WINNING_CELLS_MODE = 'off';
    expect(getWinningCellsMode()).toBe('off');
  });

  it('falls back to shadow on unknown values rather than crashing', () => {
    process.env.WINNING_CELLS_MODE = 'enabled';
    expect(getWinningCellsMode()).toBe('shadow');
  });

  it('is case-insensitive', () => {
    process.env.WINNING_CELLS_MODE = 'ACTIVE';
    expect(getWinningCellsMode()).toBe('active');
    process.env.WINNING_CELLS_MODE = 'Off';
    expect(getWinningCellsMode()).toBe('off');
  });
});
