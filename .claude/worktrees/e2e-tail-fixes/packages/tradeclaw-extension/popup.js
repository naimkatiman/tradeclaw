const DEFAULT_SETTINGS = {
  baseUrl: 'https://tradeclaw.win',
  pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
};

const statusEl = document.getElementById('status');
const signalsEl = document.getElementById('signals');
const refreshBtn = document.getElementById('refresh');
const optionsBtn = document.getElementById('options');

function normalizePairs(pairs) {
  return Array.isArray(pairs)
    ? [...new Set(pairs.map((pair) => String(pair).trim().toUpperCase()).filter(Boolean))].slice(0, 3)
    : DEFAULT_SETTINGS.pairs;
}

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve({
        baseUrl: String(items.baseUrl || DEFAULT_SETTINGS.baseUrl).replace(/\/$/, ''),
        pairs: normalizePairs(items.pairs),
      });
    });
  });
}

function setStatus(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.classList.remove('error', 'success');
  if (tone === 'error' || tone === 'success') {
    statusEl.classList.add(tone);
  }
}

function badgeClass(direction) {
  if (direction === 'BUY') return 'buy';
  if (direction === 'SELL') return 'sell';
  return 'neutral';
}

function directionLabel(direction, confidence) {
  const pct = Number.isFinite(confidence) ? `${confidence}%` : '—';
  if (direction === 'BUY' || direction === 'SELL') {
    return `${direction} · ${pct}`;
  }
  return `WAIT · ${pct}`;
}

function renderSignals(signals, settings, generatedAt) {
  if (!signals.length) {
    signalsEl.innerHTML = `
      <div class="signal-card">
        <div>
          <div class="signal-symbol">No live signals</div>
          <div class="signal-meta">Try refreshing or open the options page to change your base URL.</div>
        </div>
        <span class="badge muted">Idle</span>
      </div>
    `;
    setStatus(`Connected to ${settings.baseUrl}`, 'success');
    return;
  }

  signalsEl.innerHTML = signals
    .map((signal) => {
      const updated = signal.updatedAt ? new Date(signal.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'just now';
      const signalUrl = signal.signalUrl || `${settings.baseUrl}/dashboard`;
      return `
        <a class="signal-card" href="${signalUrl}" target="_blank" rel="noreferrer">
          <div>
            <div class="signal-symbol">${signal.symbol}</div>
            <div class="signal-meta">${updated}${signal.entry ? ` · Entry ${signal.entry}` : ''}</div>
          </div>
          <span class="badge ${badgeClass(signal.direction)}">${directionLabel(signal.direction, signal.confidence)}</span>
        </a>
      `;
    })
    .join('');

  setStatus(`Updated ${new Date(generatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'success');
}

async function fetchWidget(settings) {
  const url = new URL('/api/widget/extension', settings.baseUrl);
  url.searchParams.set('pairs', settings.pairs.join(','));

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Extension widget request failed (${response.status})`);
  }
  return response.json();
}

async function refresh() {
  const settings = await getSettings();
  setStatus(`Fetching live badges from ${settings.baseUrl}…`);
  signalsEl.innerHTML = '';

  try {
    const data = await fetchWidget(settings);
    renderSignals(data.signals || [], settings, data.generatedAt || new Date().toISOString());
  } catch (error) {
    signalsEl.innerHTML = `
      <div class="signal-card">
        <div>
          <div class="signal-symbol">Connection blocked</div>
          <div class="signal-meta">Open Options and grant access to your TradeClaw origin.</div>
        </div>
        <button id="retry-options" class="badge muted" type="button">Fix</button>
      </div>
    `;
    setStatus(error instanceof Error ? error.message : 'Unable to reach the widget endpoint.', 'error');
    const retryButton = document.getElementById('retry-options');
    retryButton?.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }
}

refreshBtn.addEventListener('click', refresh);
optionsBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());

refresh().catch((error) => {
  setStatus(error instanceof Error ? error.message : 'Unexpected popup error', 'error');
});
