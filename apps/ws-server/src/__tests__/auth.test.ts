import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const AUTH_SECRET = 'test-only-websocket-auth-secret';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadProductionAuth(secret = AUTH_SECRET) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('AUTH_SECRET', secret);
  vi.resetModules();
  return import('../middleware/auth.js');
}

function createReply() {
  const reply = {
    code: vi.fn(),
    send: vi.fn(),
  };
  reply.code.mockReturnValue(reply);
  return reply;
}

function signToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(`${header}.${encodedPayload}`)
    .digest('base64url');
  return `${header}.${encodedPayload}.${signature}`;
}

describe('production WebSocket authentication', () => {
  it('fails startup when AUTH_SECRET is missing', async () => {
    await expect(loadProductionAuth('')).rejects.toThrow(
      'AUTH_SECRET environment variable is required in production',
    );
  });

  it('rejects an unauthenticated connection before the relay handler runs', async () => {
    const { wsAuth } = await loadProductionAuth();
    const request = { query: {} };
    const reply = createReply();

    await wsAuth(request as never, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Missing token' });
    expect(request).not.toHaveProperty('userId');
  });

  it('accepts a valid, unexpired signed token', async () => {
    const { wsAuth } = await loadProductionAuth();
    const now = Math.floor(Date.now() / 1000);
    const request = {
      query: {
        token: signToken({ sub: 'user-123', iat: now, exp: now + 60 }),
      },
    };
    const reply = createReply();

    await wsAuth(request as never, reply as never);

    expect(reply.code).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
    expect(request).toHaveProperty('userId', 'user-123');
  });

  it('rejects an expired signed token', async () => {
    const { wsAuth } = await loadProductionAuth();
    const now = Math.floor(Date.now() / 1000);
    const request = {
      query: {
        token: signToken({ sub: 'user-123', iat: now - 120, exp: now - 60 }),
      },
    };
    const reply = createReply();

    await wsAuth(request as never, reply as never);

    expect(reply.code).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(request).not.toHaveProperty('userId');
  });
});
