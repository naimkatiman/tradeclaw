import { createInterface } from 'node:readline';
import { saveConfig } from '../gateway/config.js';
import { getAllSymbols } from '@tradeclaw/signals';
export async function runOnboarding() {
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const ask = (question) => new Promise(resolve => rl.question(question, resolve));
    console.log('');
    console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('  \u2551     tradeclaw-agent setup wizard      \u2551');
    console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
    console.log('');
    console.log('  Let\'s configure your trading signal agent.');
    console.log('  Press Enter to accept defaults shown in [brackets].');
    console.log('');
    const intervalStr = await ask('  \u23F1  Scan interval in seconds [60]: ');
    const scanInterval = parseInt(intervalStr) || 60;
    const allSymbols = getAllSymbols();
    console.log(`\n  Available symbols: ${allSymbols.join(', ')}`);
    const symbolsStr = await ask(`  \u{1F4CA} Symbols to watch [${allSymbols.join(',')}]: `);
    const symbols = symbolsStr.trim()
        ? symbolsStr.split(',').map(s => s.trim().toUpperCase())
        : allSymbols;
    const defaultTimeframes = 'H1,H4,D1';
    const timeframesStr = await ask(`  \u23F0 Timeframes [${defaultTimeframes}]: `);
    const timeframes = (timeframesStr.trim() || defaultTimeframes)
        .split(',')
        .map(t => t.trim());
    const confidenceStr = await ask('  \u{1F3AF} Minimum confidence threshold (0-100) [70]: ');
    const minConfidence = parseInt(confidenceStr) || 70;
    const channels = [];
    console.log('');
    const telegramEnabled = await ask('  \u{1F4F1} Enable Telegram channel? (y/N): ');
    if (telegramEnabled.toLowerCase() === 'y') {
        const botToken = await ask('     Telegram Bot Token: ');
        const chatId = await ask('     Telegram Chat ID: ');
        if (botToken && chatId) {
            channels.push({
                type: 'telegram',
                enabled: true,
                telegramBotToken: botToken.trim(),
                telegramChatId: chatId.trim(),
            });
            console.log('     \u2705 Telegram configured');
        }
        else {
            console.log('     \u26A0\uFE0F  Missing bot token or chat ID, skipping Telegram');
        }
    }
    const discordEnabled = await ask('\n  \u{1F4AC} Enable Discord channel? (y/N): ');
    if (discordEnabled.toLowerCase() === 'y') {
        const webhookUrl = await ask('     Discord Webhook URL: ');
        if (webhookUrl) {
            channels.push({
                type: 'discord',
                enabled: true,
                discordWebhookUrl: webhookUrl.trim(),
            });
            console.log('     \u2705 Discord configured');
        }
        else {
            console.log('     \u26A0\uFE0F  Missing webhook URL, skipping Discord');
        }
    }
    const webhookEnabled = await ask('\n  \u{1F517} Enable generic webhook? (y/N): ');
    if (webhookEnabled.toLowerCase() === 'y') {
        const webhookUrl = await ask('     Webhook URL: ');
        if (webhookUrl) {
            channels.push({
                type: 'webhook',
                enabled: true,
                webhookUrl: webhookUrl.trim(),
            });
            console.log('     \u2705 Webhook configured');
        }
        else {
            console.log('     \u26A0\uFE0F  Missing webhook URL, skipping');
        }
    }
    const config = {
        scanInterval,
        minConfidence,
        symbols,
        timeframes,
        channels,
        skills: ['rsi-divergence', 'macd-crossover'],
    };
    console.log('');
    await saveConfig(config);
    rl.close();
    console.log('');
    console.log('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557');
    console.log('  \u2551           Setup Complete! \u{1F389}          \u2551');
    console.log('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D');
    console.log('');
    console.log(`  Symbols:     ${symbols.join(', ')}`);
    console.log(`  Timeframes:  ${timeframes.join(', ')}`);
    console.log(`  Interval:    ${scanInterval}s`);
    console.log(`  Confidence:  ${minConfidence}%`);
    console.log(`  Channels:    ${channels.length > 0 ? channels.map(c => c.type).join(', ') : 'none (console only)'}`);
    console.log('');
    console.log('  Next steps:');
    console.log('    1. Run a test scan:     tradeclaw-agent scan');
    console.log('    2. Test your channels:  tradeclaw-agent test-channel');
    console.log('    3. Start the daemon:    tradeclaw-agent start');
    console.log('');
}
//# sourceMappingURL=onboard.js.map