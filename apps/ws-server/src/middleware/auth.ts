import type { FastifyRequest, FastifyReply } from 'fastify';
import { createHmac, timingSafeEqual } from 'node:crypto';

const AUTH_SECRET = process.env.AUTH_SECRET;
const IS_DEV = process.env.NODE_ENV !== 'production';

// Fail fast in production if secret is missing
if (!IS_DEV && !AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is required in production');
}

interface TokenPayload {
  sub: string;
  exp: number;
  iat: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}

export async function wsAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Skip auth in development when no secret is configured
  if (IS_DEV && !AUTH_SECRET) return;

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
