const DEFAULT_SETTINGS = {
  baseUrl: 'https://tradeclaw.win',
  pairs: ['BTCUSD', 'ETHUSD', 'XAUUSD'],
};

const form = document.getElementById('options-form');
const baseUrlInput = document.getElementById('baseUrl');
const statusEl = document.getElementById('status');
const resetButton = document.getElementById('reset');
const pairInputs = [...document.querySelectorAll('input[data-pair]')];

function setStatus(message, tone = 'info') {
  statusEl.textContent = message;
  statusEl.classList.remove('error', 'success');
  if (tone === 'error' || tone === 'success') {
    statusEl.classList.add(tone);
  }
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function readPairs() {
  return pairInputs.filter((input) => input.checked).map((input) => input.dataset.pair);
}

function saveSettings(settings) {
  return new Promise((resolve) => chrome.storage.sync.set(settings, resolve));
}

function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULT_SETTINGS, (items) => {
      resolve({
        baseUrl: normalizeBaseUrl(items.baseUrl || DEFAULT_SETTINGS.baseUrl),
        pairs: Array.isArray(items.pairs) ? items.pairs : DEFAULT_SETTINGS.pairs,
      });
    });
  });
}

async function requestOriginPermission(baseUrl) {
  const origin = new URL(baseUrl).origin;
  const permission = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!permission) {
    throw new Error(`Permission denied for ${origin}`);
  }
}

async function hydrate() {
  const settings = await loadSettings();
  baseUrlInput.value = settings.baseUrl;
  pairInputs.forEach((input) => {
    input.checked = settings.pairs.includes(input.dataset.pair);
  });
  setStatus('Ready to save your extension settings.');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  try {
    const baseUrl = normalizeBaseUrl(baseUrlInput.value);
    if (!baseUrl) {
      throw new Error('Please enter a valid TradeClaw base URL.');
    }

    await requestOriginPermission(baseUrl);
    const pairs = readPairs();
    await saveSettings({ baseUrl, pairs });
    setStatus(`Saved ${baseUrl} with ${pairs.join(', ')}.`, 'success');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Failed to save settings.', 'error');
  }
});

resetButton.addEventListener('click', async () => {
  await saveSettings(DEFAULT_SETTINGS);
  baseUrlInput.value = DEFAULT_SETTINGS.baseUrl;
  pairInputs.forEach((input) => {
    input.checked = DEFAULT_SETTINGS.pairs.includes(input.dataset.pair);
  });
  setStatus('Restored default TradeClaw settings.', 'success');
});

hydrate().catch((error) => {
  setStatus(error instanceof Error ? error.message : 'Failed to load settings.', 'error');
});
