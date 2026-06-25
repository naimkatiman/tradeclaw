const BLOCKED_PATH_PARTS = [
  "/checkout",
  "/billing",
  "/account",
  "/settings/security",
  "/broker",
  "/connect-wallet",
  "/withdraw",
  "/deposit",
  // Live tradeclaw.win identity/payment routes. Keep the agent off any login,
  // signup, or purchase surface even when a hostile page link or the
  // computer-use model tries to steer there — the audit only ever needs /backtest.
  "/subscribe",
  "/pricing",
  "/upgrade",
  "/payment",
  "/pay",
  "/signin",
  "/sign-in",
  "/login",
  "/api-keys",
];

const INJECTION_PATTERNS = [
  /ignore (all|any|the) previous instructions/i,
  /system message/i,
  /developer message/i,
  /reveal (your|the) prompt/i,
  /enter (your )?(password|api key|seed phrase)/i,
  /send (the|your) credentials/i,
];

export function assertUrlAllowed(rawUrl, allowedHosts) {
  const url = new URL(rawUrl);
  if (!allowedHosts.has(url.hostname)) {
    throw new Error(`Navigation blocked: ${url.hostname} is not allowlisted`);
  }
  const path = url.pathname.toLowerCase();
  const blocked = BLOCKED_PATH_PARTS.find((part) => path.includes(part));
  if (blocked) {
    throw new Error(`Navigation blocked: high-impact path contains ${blocked}`);
  }
  return url;
}

export function detectPromptInjection(text) {
  const sample = String(text ?? "").slice(0, 100_000);
  return INJECTION_PATTERNS.find((pattern) => pattern.test(sample))?.source ?? null;
}

export async function assertSafePage(page, allowedHosts) {
  assertUrlAllowed(page.url(), allowedHosts);
  const visibleText = await page.locator("body").innerText().catch(() => "");
  const match = detectPromptInjection(visibleText);
  if (match) {
    throw new Error(`Possible prompt injection detected in page text (${match}); automation stopped`);
  }
}
