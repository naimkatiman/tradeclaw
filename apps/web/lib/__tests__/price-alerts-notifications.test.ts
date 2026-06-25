import { formatAlertTriggeredMessage, sendTriggeredAlertNotifications } from '../price-alerts';
import { getUserById } from '../db';
import { sendTelegramMessage } from '../telegram-send';

jest.mock('../db', () => ({
  getUserById: jest.fn(),
}));

jest.mock('../telegram-send', () => ({
  escapeHtml: (value: string) => value,
  sendTelegramMessage: jest.fn(),
}));

const mockedGetUserById = getUserById as jest.MockedFunction<typeof getUserById>;
const mockedSendTelegramMessage = sendTelegramMessage as jest.MockedFunction<typeof sendTelegramMessage>;

describe('price-alert Telegram notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('formats a readable HTML Telegram message', () => {
    const message = formatAlertTriggeredMessage({
      id: 'alert_1',
      userId: 'user_1',
      symbol: 'BTCUSD',
      direction: 'above',
      targetPrice: 90000,
      currentPrice: 90123.4567,
      status: 'triggered',
      createdAt: new Date().toISOString(),
      triggeredAt: new Date().toISOString(),
      note: 'Breakout above resistance',
      timeWindow: '4h',
    });

    expect(message).toContain('<b>Price alert triggered</b>');
    expect(message).toContain('<b>BTCUSD</b> rose above <b>90000.0000</b>');
    expect(message).toContain('Current: <b>90123.4567</b>');
    expect(message).toContain('Window: <b>4h</b>');
    expect(message).toContain('Breakout above resistance');
  });

  it('sends Telegram DMs only when the user has a linked Telegram account', async () => {
    mockedGetUserById
      .mockResolvedValueOnce({ telegramUserId: BigInt(123) } as Awaited<ReturnType<typeof getUserById>>)
      .mockResolvedValueOnce({ telegramUserId: null } as Awaited<ReturnType<typeof getUserById>>);
    mockedSendTelegramMessage.mockResolvedValue({ ok: true });

    const result = await sendTriggeredAlertNotifications([
      {
        id: 'alert_1',
        userId: 'user_1',
        symbol: 'EURUSD',
        direction: 'below',
        targetPrice: 1.08,
        currentPrice: 1.0795,
        status: 'triggered',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'alert_2',
        userId: 'user_2',
        symbol: 'XAUUSD',
        direction: 'above',
        targetPrice: 2200,
        currentPrice: 2201,
        status: 'triggered',
        createdAt: new Date().toISOString(),
      },
    ]);

    expect(mockedSendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(mockedSendTelegramMessage).toHaveBeenCalledWith(
      '123',
      expect.stringContaining('EURUSD'),
    );
    expect(result).toEqual({ sent: 1, skipped: 1 });
  });
});
