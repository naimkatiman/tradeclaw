import { test } from '@playwright/test';

export function skipIfNotLocal(): void {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
  test.skip(!isLocal, `Skipped: only runs against local BASE_URL (got ${baseUrl}). This test mutates production state.`);
}
