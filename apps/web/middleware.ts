import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// 1. Rate-limit store (in-memory, per-IP, resets every 60 s)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// Periodically prune stale entries so the map doesn't grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);

// ---------------------------------------------------------------------------
// 2. Admin-auth route definitions
//    Each entry: [pathPattern (string | RegExp), Set of methods that NEED auth]
// ---------------------------------------------------------------------------
type AuthRule = { pattern: string | RegExp; methods: Set<string> };

const AUTH_RULES: AuthRule[] = [
  // /api/plugins/test — POST needs auth
  { pattern: "/api/plugins/test", methods: new Set(["POST"]) },
  // /api/plugins/[id] — PATCH, DELETE need auth (GET allowed)
  { pattern: /^\/api\/plugins\/[^/]+$/, methods: new Set(["PATCH", "DELETE"]) },
  // /api/plugins — POST, PATCH, DELETE need auth (GET allowed)
  { pattern: "/api/plugins", methods: new Set(["POST", "PATCH", "DELETE"]) },
  // /api/keys/[id] — PATCH, DELETE need auth
  { pattern: /^\/api\/keys\/[^/]+$/, methods: new Set(["PATCH", "DELETE"]) },
  // /api/keys — POST, DELETE need auth (GET allowed)
  { pattern: "/api/keys", methods: new Set(["POST", "DELETE"]) },
  // /api/import — POST
  { pattern: "/api/import", methods: new Set(["POST"]) },
  // /api/webhooks/deliver — POST
  { pattern: "/api/webhooks/deliver", methods: new Set(["POST"]) },
  // /api/webhooks/[id] — DELETE
  {
    pattern: /^\/api\/webhooks\/[^/]+$/,
    methods: new Set(["DELETE"]),
  },
  // /api/webhooks — POST, PATCH, DELETE (GET allowed)
  { pattern: "/api/webhooks", methods: new Set(["POST", "PATCH", "DELETE"]) },
  // /api/performance/reset — POST
  { pattern: "/api/performance/reset", methods: new Set(["POST"]) },
  // /api/paper-trading/reset — POST
  { pattern: "/api/paper-trading/reset", methods: new Set(["POST"]) },
];

function requiresAuth(pathname: string, method: string): boolean {
  for (const rule of AUTH_RULES) {
    const matches =
      typeof rule.pattern === "string"
        ? pathname === rule.pattern
        : rule.pattern.test(pathname);

    if (matches && rule.methods.has(method.toUpperCase())) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// 3. Security headers helper
// ---------------------------------------------------------------------------
function applySecurityHeaders(
  response: NextResponse,
  pathname: string,
): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set(
    "X-Frame-Options",
    pathname.startsWith("/embed") ? "SAMEORIGIN" : "DENY",
  );
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return response;
}

// ---------------------------------------------------------------------------
// 4. Middleware
// ---------------------------------------------------------------------------
let adminSecretWarningLogged = false;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // --- Rate limiting for /api/ routes ---
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip)) {
      const res = NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
      res.headers.set("Retry-After", "60");
      return applySecurityHeaders(res, pathname);
    }
  }

  // --- Admin auth ---
  if (requiresAuth(pathname, method)) {
    const adminSecret = process.env.ADMIN_SECRET;

    if (!adminSecret) {
      // Dev mode — allow but warn once
      if (!adminSecretWarningLogged) {
        console.warn(
          "[middleware] ADMIN_SECRET is not set. All admin routes are unprotected (dev mode).",
        );
        adminSecretWarningLogged = true;
      }
    } else {
      const authHeader = request.headers.get("authorization");
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      if (token !== adminSecret) {
        const res = NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
        return applySecurityHeaders(res, pathname);
      }
    }
  }

  // --- Continue with security headers ---
  const response = NextResponse.next();
  return applySecurityHeaders(response, pathname);
}

// ---------------------------------------------------------------------------
// 5. Matcher config
// ---------------------------------------------------------------------------
export const config = {
  matcher: [
    // API routes
    "/api/:path*",
    // All page routes, excluding static assets
    "/((?!_next/static|_next/image|favicon\\.ico|sw\\.js|manifest\\.json).*)",
  ],
};
