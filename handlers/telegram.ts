import { TelegramBot } from '../services/telegram';

export async function testTelegramBot(token: string): Promise<any> {
  try {
    // Test bot info
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json() as { ok: boolean; result?: any; description?: string };

    if (data.ok) {
      return {
        success: true,
        botInfo: data.result,
      };
    } else {
      return {
        success: false,
        error: data.description || 'Unknown error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}

export async function setTelegramWebhook(token: string, webhookUrl: string): Promise<any> {
  const bot = new TelegramBot({ token });

  try {
    const success = await bot.setWebhook(webhookUrl);
    return { success };
  } catch (error) {
    return {
      success: false,
      error: String(error),
    };
  }
}
