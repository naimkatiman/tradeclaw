import { rowToAlertSignal } from '../discord-broadcast';
import { formatDiscordEmbed } from '../alert-channels';

describe('discord-broadcast — rowToAlertSignal', () => {
  const baseRow = {
    id: 'SIG-BTCUSD-H1-BUY-ABC',
    pair: 'BTCUSD',
    direction: 'BUY',
    confidence: 87,
    entry_price: '64000.5',
    tp1: '65000',
    sl: '63000',
    timeframe: 'H1',
  };

  it('maps a signal_history row to the AlertSignal shape', () => {
    expect(rowToAlertSignal(baseRow)).toEqual({
      id: 'SIG-BTCUSD-H1-BUY-ABC',
      symbol: 'BTCUSD',
      direction: 'BUY',
      confidence: 87,
      timeframe: 'H1',
      entry: '64000.5',
      takeProfit1: '65000',
      stopLoss: '63000',
    });
  });

  it('normalizes any non-SELL direction to BUY', () => {
    expect(rowToAlertSignal({ ...baseRow, direction: 'SELL' }).direction).toBe('SELL');
    expect(rowToAlertSignal({ ...baseRow, direction: 'buy' }).direction).toBe('BUY');
  });

  it('produces a green embed for BUY and red for SELL', () => {
    const buy = formatDiscordEmbed(rowToAlertSignal(baseRow));
    const sell = formatDiscordEmbed(rowToAlertSignal({ ...baseRow, direction: 'SELL' }));
    expect(buy.embeds[0].color).toBe(0x10b981);
    expect(sell.embeds[0].color).toBe(0xef4444);
    expect(buy.embeds[0].title).toBe('BUY BTCUSD');
  });
});
