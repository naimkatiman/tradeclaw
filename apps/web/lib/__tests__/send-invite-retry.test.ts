/**
 * Retry semantics for sendInviteWithRetry. Uses the function's `sender`
 * dependency-injection seam to swap in a mock for the underlying sendInvite
 * (which orchestrates createChatInviteLink + sendMessage + DB insert) so we
 * can drive the retry/back-off/non-retryable classification deterministically
 * without touching env vars or the network.
 */

import { sendInviteWithRetry } from '../telegram';

describe('sendInviteWithRetry', () => {
  it('returns ok on first-attempt success without retrying', async () => {
    const sender = jest.fn().mockResolvedValueOnce('https://t.me/+abc');

    const result = await sendInviteWithRetry('user-1', '12345', 'pro', { sender });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(1);
    expect(result.inviteLink).toBe('https://t.me/+abc');
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it('retries transient failures and reports the attempt count', async () => {
    const sender = jest
      .fn()
      .mockRejectedValueOnce(new Error('Telegram API error (sendMessage): Bad Gateway'))
      .mockRejectedValueOnce(new Error('Telegram API error (sendMessage): Too Many Requests'))
      .mockResolvedValueOnce('https://t.me/+xyz');

    const result = await sendInviteWithRetry('user-1', '12345', 'pro', {
      sender,
      baseDelayMs: 1,
    });

    expect(result.ok).toBe(true);
    expect(result.attempts).toBe(3);
    expect(sender).toHaveBeenCalledTimes(3);
  });

  it('short-circuits on non-retryable errors (chat not found)', async () => {
    const sender = jest
      .fn()
      .mockRejectedValueOnce(
        new Error('Telegram API error (createChatInviteLink): Bad Request: chat not found'),
      );

    const result = await sendInviteWithRetry('user-1', '12345', 'pro', {
      sender,
      baseDelayMs: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.retryable).toBe(false);
    expect(result.error).toMatch(/chat not found/);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it('short-circuits when the user blocked the bot', async () => {
    const sender = jest
      .fn()
      .mockRejectedValueOnce(
        new Error('Telegram API error (sendMessage): Forbidden: bot was blocked by the user'),
      );

    const result = await sendInviteWithRetry('user-1', '12345', 'pro', {
      sender,
      baseDelayMs: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.retryable).toBe(false);
    expect(sender).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxAttempts of retryable errors', async () => {
    const sender = jest.fn().mockRejectedValue(new Error('ECONNRESET'));

    const result = await sendInviteWithRetry('user-1', '12345', 'pro', {
      sender,
      maxAttempts: 3,
      baseDelayMs: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.retryable).toBe(true);
    expect(result.error).toBe('ECONNRESET');
    expect(sender).toHaveBeenCalledTimes(3);
  });
});
