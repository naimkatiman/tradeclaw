import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { allowedHostsFromEnv } from "./config.mjs";
import { assertSafePage, assertUrlAllowed } from "./security.mjs";
import { extractBacktestMetrics, hasUsefulMetrics } from "./extract.mjs";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uiAliases(value) {
  const aliases = {
    ALL: ["ALL", "All"],
    "VWAP+EMA+BB": ["VWAP+EMA+BB", "VWAP + EMA + BB"],
    "VWAP + EMA + BB": ["VWAP+EMA+BB", "VWAP + EMA + BB"],
  };
  return aliases[value] ?? [value];
}

const PRESET_LABELS = [
  "Classic",
  "Regime Aware",
  "HMM Top-3",
  "VWAP + EMA + Bollinger",
  "Full Risk Pipeline",
];

function normalizePresetKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[+&]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const PRESET_ALIAS_MAP = new Map([
  ["classic", ["Classic"]],
  ["regime aware", ["Regime Aware"]],
  ["hmm top 3", ["HMM Top-3"]],
  ["vwap ema bb", ["VWAP + EMA + Bollinger"]],
  ["vwap ema bollinger", ["VWAP + EMA + Bollinger"]],
  ["full risk pipeline", ["Full Risk Pipeline"]],
]);

function presetLabelsForStrategy(strategy) {
  const labels = PRESET_ALIAS_MAP.get(normalizePresetKey(strategy));
  if (!labels) {
    throw new Error(
      `Unsupported TradeClaw preset ${JSON.stringify(strategy)}. ` +
        `Use one of: ${PRESET_LABELS.join(", ")}.`,
    );
  }
  return labels;
}

function textMatchesAnyPreset(text, labels) {
  const key = normalizePresetKey(text);
  return labels.some((label) => normalizePresetKey(label) === key);
}

async function firstVisible(locator) {
  const count = await locator.count();
  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    if (await candidate.isVisible().catch(() => false)) return candidate;
  }
  return null;
}

async function inputNearVisibleLabel(page, pattern) {
  const labels = page.locator("label").filter({ hasText: pattern });
  const count = await labels.count();

  for (let index = 0; index < count; index += 1) {
    const label = labels.nth(index);
    if (!await label.isVisible().catch(() => false)) continue;

    const nested = await firstVisible(label.locator("input, textarea"));
    if (nested) return nested;

    const sibling = await firstVisible(
      label.locator("xpath=following-sibling::*[self::input or self::textarea][1]"),
    );
    if (sibling) return sibling;
  }

  return null;
}

async function clickChoice(page, value) {
  for (const label of uiAliases(value)) {
    const exactName = new RegExp(`^\\s*${escapeRegExp(label)}\\s*$`, "i");
    const candidates = [
      page.getByRole("button", { name: exactName }),
      page.getByRole("radio", { name: exactName }),
      page.getByText(exactName),
    ];

    for (const locator of candidates) {
      const candidate = await firstVisible(locator);
      if (candidate) {
        await candidate.scrollIntoViewIfNeeded();
        await candidate.click();
        return;
      }
    }

    const selects = page.locator("select");
    const selectCount = await selects.count();
    for (let index = 0; index < selectCount; index += 1) {
      const select = selects.nth(index);
      const labels = await select.locator("option").allTextContents().catch(() => []);
      const matchingLabel = labels.find((option) => option.trim().toLowerCase() === label.toLowerCase());
      if (matchingLabel) {
        await select.selectOption({ label: matchingLabel });
        return;
      }
    }
  }

  throw new Error(`Could not find a visible TradeClaw control for ${JSON.stringify(value)}`);
}

async function fillRequired(page, labelPatterns, value, fieldName) {
  for (const pattern of labelPatterns) {
    const byLabel = await firstVisible(page.getByLabel(pattern));
    if (byLabel) {
      await byLabel.fill(String(value));
      return;
    }

    const byPlaceholder = await firstVisible(page.getByPlaceholder(pattern));
    if (byPlaceholder) {
      await byPlaceholder.fill(String(value));
      return;
    }

    const bySiblingLabel = await inputNearVisibleLabel(page, pattern);
    if (bySiblingLabel) {
      await bySiblingLabel.fill(String(value));
      return;
    }
  }
  throw new Error(`${fieldName} control was not found; refusing to report an unverified assumption`);
}

async function checkedState(locator) {
  const ariaChecked = await locator.getAttribute("aria-checked").catch(() => null);
  if (ariaChecked === "true") return true;
  if (ariaChecked === "false") return false;
  return locator.isChecked().catch(() => null);
}

async function setPresetSelection(page, strategy) {
  const targetLabels = presetLabelsForStrategy(strategy);
  const presetControls = [];
  const labels = page.locator("label");
  const count = await labels.count();

  for (let index = 0; index < count; index += 1) {
    const label = labels.nth(index);
    if (!await label.isVisible().catch(() => false)) continue;

    const text = (await label.innerText().catch(() => "")).trim();
    if (!textMatchesAnyPreset(text, PRESET_LABELS)) continue;

    const checkbox = await firstVisible(label.locator('input[type="checkbox"]'));
    if (!checkbox) continue;
    presetControls.push({ text, checkbox });
  }

  const targetControls = presetControls.filter((control) => textMatchesAnyPreset(control.text, targetLabels));
  if (targetControls.length === 0) {
    throw new Error(`Preset checkbox for ${JSON.stringify(strategy)} was not found`);
  }

  for (const { checkbox } of targetControls) {
    if (await checkedState(checkbox) === false) await checkbox.click();
  }

  for (const { text, checkbox } of presetControls) {
    if (textMatchesAnyPreset(text, targetLabels)) continue;
    if (await checkedState(checkbox) === true) await checkbox.click();
  }
}

async function setSlippageRequired(page, enabled) {
  const controls = [
    page.getByRole("checkbox", { name: /slippage/i }),
    page.getByRole("switch", { name: /slippage/i }),
    page.getByLabel(/slippage/i),
  ];

  for (const locator of controls) {
    const control = await firstVisible(locator);
    if (!control) continue;
    const before = await checkedState(control);
    if (before === null) continue;
    if (before !== enabled) await control.click();
    const after = await checkedState(control);
    if (after !== enabled) {
      throw new Error(`Slippage control could not be set to ${enabled ? "enabled" : "disabled"}`);
    }
    return;
  }

  throw new Error("Slippage control was not found; refusing to report an unverified cost assumption");
}

async function dismissLowImpactBanners(page) {
  for (const name of [/accept all/i, /^accept$/i, /got it/i]) {
    const button = await firstVisible(page.getByRole("button", { name }));
    if (button) {
      await button.click().catch(() => undefined);
      return;
    }
  }
}

async function waitForBacktestResult(page, beforeText) {
  await page.waitForFunction(
    (before) => {
      const text = document.body?.innerText ?? "";
      const patterns = [
        /total\s+return\s*[:\n]?\s*[+-]?[\d,.]+\s*%?/i,
        /profit\s+factor\s*[:\n]?\s*[\d,.]+/i,
        /max(?:imum)?\s+drawdown\s*[:\n]?\s*[+-]?[\d,.]+\s*%?/i,
        /total\s+trades\s*[:\n]?\s*[\d,.]+/i,
        /win\s+rate\s*[:\n]?\s*[\d,.]+\s*%?/i,
      ];
      return text !== before && patterns.filter((pattern) => pattern.test(text)).length >= 2;
    },
    beforeText,
    { timeout: 90_000 },
  );
}

export async function createIsolatedBrowser({ headless = true } = {}) {
  const { chromium } = await import("playwright");
  const allowedHosts = allowedHostsFromEnv();
  const browser = await chromium.launch({
    headless,
    chromiumSandbox: true,
    env: {},
    args: ["--disable-extensions", "--disable-file-system"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: false,
    permissions: [],
    serviceWorkers: "block",
  });

  await context.route("**/*", async (route) => {
    try {
      const url = new URL(route.request().url());
      if (["http:", "https:"].includes(url.protocol)) {
        assertUrlAllowed(url.toString(), allowedHosts);
      }
      await route.continue();
    } catch {
      await route.abort("blockedbyclient");
    }
  });

  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("dialog", (dialog) => dialog.dismiss().catch(() => undefined));
  page.on("popup", (popup) => popup.close().catch(() => undefined));

  return { browser, context, page };
}

export async function runDeterministicBacktest({ page, request, run, artifactDir }) {
  const allowedHosts = allowedHostsFromEnv();
  const targetUrl = new URL("/backtest", request.baseUrl).toString();
  assertUrlAllowed(targetUrl, allowedHosts);

  await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissLowImpactBanners(page);
  await assertSafePage(page, allowedHosts);

  await clickChoice(page, run.symbol);
  await clickChoice(page, run.timeframe);
  await clickChoice(page, run.period);
  await setPresetSelection(page, run.strategy);

  await fillRequired(page, [/initial balance/i, /starting balance/i], run.initialBalance, "Initial balance");
  await fillRequired(page, [/risk per trade/i, /risk %/i], run.riskPerTradePercent, "Risk per trade");
  await setSlippageRequired(page, run.includeSlippage);

  await assertSafePage(page, allowedHosts);
  const runButton = await firstVisible(page.getByRole("button", { name: /run backtest/i }));
  if (!runButton) throw new Error("Run Backtest button was not found");
  const beforeText = await page.locator("body").innerText();
  await runButton.click();
  await waitForBacktestResult(page, beforeText);
  await assertSafePage(page, allowedHosts);

  const rawText = await page.locator("body").innerText();
  const metrics = extractBacktestMetrics(rawText);
  if (!hasUsefulMetrics(metrics)) {
    throw new Error("Backtest finished, but fewer than two result metrics could be extracted");
  }

  await mkdir(artifactDir, { recursive: true });
  const screenshotPath = path.join(artifactDir, `${run.id}.png`);
  const rawTextPath = path.join(artifactDir, `${run.id}.txt`);
  await page.screenshot({ path: screenshotPath, fullPage: true, type: "png" });
  await writeFile(rawTextPath, rawText.slice(0, 100_000), "utf8");

  return {
    ...run,
    status: "completed",
    mode: "deterministic",
    metrics,
    sourceUrl: page.url(),
    screenshotPath,
    rawTextPath,
    completedAt: new Date().toISOString(),
  };
}
