// Browser-side helpers for reading/writing the stored license key and
// injecting it into fetch calls. NEVER imported from server code.

const STORAGE_KEY = 'tc_license_key';
const COOKIE_NAME = 'tc_license_key';
const LICENSE_HEADER = 'X-License-Key';
const COOKIE_MAX_AGE_DAYS = 365;

export function getStoredKey(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredKey(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, key);
  } catch {
    // localStorage blocked — fall through to cookie only
  }
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  // Non-HttpOnly so the SSR cookie mirror works via next/headers.
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(key)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function clearStoredKey(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
}

export async function fetchWithLicense(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const key = getStoredKey();
  const headers = new Headers(init.headers ?? {});
  if (key) {
    headers.set(LICENSE_HEADER, key);
  }
  return fetch(url, { ...init, headers });
}

export interface VerifyResponse {
  valid: boolean;
  reason?: string;
  unlockedStrategies?: string[];
  expiresAt?: string | null;
  issuedTo?: string | null;
}

export async function verifyKey(key: string): Promise<VerifyResponse> {
  const res = await fetch('/api/licenses/verify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  return (await res.json()) as VerifyResponse;
}
