/**
 * User-facing strings for /api/telegram/resend-invite error codes.
 * Shared by the post-checkout welcome flow and the dashboard invite badge
 * so both surfaces stay aligned when new error codes are added.
 */
export function messageForResendError(code: string | undefined): string {
  switch (code) {
    case 'no_telegram_link':
      return 'Tap "Open Telegram bot" first to link your account.';
    case 'free_tier':
      return 'Pro group access requires a paid plan.';
    case 'unauthorized':
      return 'Your session expired — sign in again.';
    case 'rate_limited':
      return 'Too many invite requests. Try again in 10 minutes.';
    case 'chat_not_found':
      return 'Open the bot in Telegram and press Start, then tap Resend.';
    case 'bot_blocked':
      return 'You blocked the bot. Unblock @TradeClaw_win_Bot in Telegram, then tap Resend.';
    case 'send_failed':
      return 'Telegram is unreachable right now. Try again in a moment.';
    default:
      return 'Resend failed. Try again in a moment.';
  }
}
