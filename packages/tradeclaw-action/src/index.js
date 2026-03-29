const core = require('@actions/core');

async function run() {
  try {
    const pair = core.getInput('pair', { required: true });
    const timeframe = core.getInput('timeframe') || 'H1';
    const baseUrl = (core.getInput('base_url') || 'https://tradeclaw.win').replace(/\/+$/, '');
    const failOnSignal = core.getInput('fail_on_signal') || 'none';
    const signalDirection = core.getInput('signal_direction') || '';
    const minConfidence = parseInt(core.getInput('min_confidence') || '0', 10);

    core.info(`Fetching signal for ${pair} @ ${timeframe} from ${baseUrl}`);

    const url = `${baseUrl}/api/signal?pair=${encodeURIComponent(pair)}&tf=${encodeURIComponent(timeframe)}`;
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`TradeClaw API returned ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    const signal = data.signal || data.direction || 'NEUTRAL';
    const confidence = data.confidence ?? data.score ?? 0;
    const rsi = data.rsi ?? data.indicators?.rsi ?? 'N/A';

    // Set outputs
    core.setOutput('signal', signal);
    core.setOutput('confidence', String(confidence));
    core.setOutput('pair', pair);
    core.setOutput('timeframe', timeframe);
    core.setOutput('rsi', String(rsi));
    core.setOutput('direction', signal);

    // Write GitHub Step Summary
    const emoji = signal === 'BUY' ? '🟢' : signal === 'SELL' ? '🔴' : '⚪';
    const summary = [
      `## ${emoji} TradeClaw Signal — ${pair} @ ${timeframe}`,
      '',
      '| Field | Value |',
      '|-------|-------|',
      `| **Pair** | ${pair} |`,
      `| **Timeframe** | ${timeframe} |`,
      `| **Signal** | ${emoji} **${signal}** |`,
      `| **Confidence** | ${confidence}% |`,
      `| **RSI** | ${rsi} |`,
      '',
      `> Powered by [TradeClaw](${baseUrl}) — open-source AI trading signals`,
    ].join('\n');

    await core.summary.addRaw(summary).write();

    core.info(`Signal: ${signal} | Confidence: ${confidence}% | RSI: ${rsi}`);

    // Check min_confidence threshold
    if (minConfidence > 0 && confidence < minConfidence) {
      core.setFailed(`Confidence ${confidence}% is below minimum threshold of ${minConfidence}%`);
      return;
    }

    // Check signal_direction filter
    if (signalDirection && signal !== signalDirection.toUpperCase()) {
      core.setFailed(`Signal is ${signal}, expected ${signalDirection.toUpperCase()}`);
      return;
    }

    // Check fail_on_signal
    if (failOnSignal !== 'none' && signal === failOnSignal.toUpperCase()) {
      core.setFailed(`Signal is ${signal}, which matches fail_on_signal=${failOnSignal}`);
      return;
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
