import { describe, it, expect } from 'vitest';
import { acquireConnection, releaseConnection } from '../middleware/rate-limit.js';

// MAX_CONNECTIONS_PER_IP is 5 in rate-limit.ts. Each test uses a unique IP so
// the shared per-IP map doesn't leak state between cases.
const CAP = 5;

describe('acquireConnection / releaseConnection (concurrent per-IP)', () => {
  it('allows acquiring up to the cap', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < CAP; i++) {
      expect(acquireConnection(ip)).toBe(true);
    }
  });

  it('rejects the connection over the cap', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < CAP; i++) {
      expect(acquireConnection(ip)).toBe(true);
    }
    expect(acquireConnection(ip)).toBe(false);
  });

  it('allows a new acquire after a release', () => {
    const ip = '10.0.0.3';
    for (let i = 0; i < CAP; i++) {
      expect(acquireConnection(ip)).toBe(true);
    }
    expect(acquireConnection(ip)).toBe(false);

    releaseConnection(ip);
    expect(acquireConnection(ip)).toBe(true);
    // Back at the cap again.
    expect(acquireConnection(ip)).toBe(false);
  });

  it('does not over-decrement below zero', () => {
    const ip = '10.0.0.4';
    // Releasing with no live connections is a no-op, not a negative count.
    releaseConnection(ip);
    releaseConnection(ip);
    // Should still allow a full cap's worth of acquires.
    for (let i = 0; i < CAP; i++) {
      expect(acquireConnection(ip)).toBe(true);
    }
    expect(acquireConnection(ip)).toBe(false);
  });

  it('isolates counts per IP', () => {
    const a = '10.0.0.5';
    const b = '10.0.0.6';
    for (let i = 0; i < CAP; i++) {
      expect(acquireConnection(a)).toBe(true);
    }
    expect(acquireConnection(a)).toBe(false);
    // b is untouched and still has its full cap.
    expect(acquireConnection(b)).toBe(true);
  });
});
