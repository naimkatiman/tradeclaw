import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Tier } from '../tier.js';

const AUTH_SECRET = process.env.AUTH_SECRET;
const IS_DEV = process.env.NODE_ENV !== 'production';

const VALID_TIERS: ReadonlySet<Tier> = new Set<Tier>(['free', 'pro', 'elite', 'custom']);

// Fail fast in production if secret is missing
if (!IS_DEV && !AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required in production');
}

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
  /**
   * Optional tier claim. When the apps/web token minter starts embedding
   * the caller's tier we read it here; until then (and for any malformed
   * or unknown value) the relay falls back to 'free' for fail-closed
   * symbol gating.
   */
  tier?: Tier;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    /**
     * Resolved subscription tier. Always populated by `wsAuth` (or set
     * to 'free' on the dev-mode anonymous path). Never undefined inside
     * a request that successfully reached `relayPlugin`.
     */
    tier?: Tier;
  }
}

export async function wsAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip auth in development when no secret is configured. Default to
  // free tier so any per-symbol gate downstream still applies.
  if (IS_DEV && !AUTH_SECRET) {
    request.tier = 'free';
    return;
  }

  const query = request.query as { token?: string };
  const token = query.token;

  if (!token) {
    reply.code(401).send({ error: 'Missing token' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    reply.code(401).send({ error: 'Invalid or expired token' });
    return;
  }

  request.userId = payload.sub;
  request.tier =
    payload.tier && VALID_TIERS.has(payload.tier) ? payload.tier : 'free';
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expected = createHmac('sha256', AUTH_SECRET!)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expected, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as TokenPayload;

    // Check expiry
    if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;

    return decoded;
  } catch {
    return null;
  }
}
