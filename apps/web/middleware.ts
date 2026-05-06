import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// 1. Rate-limit store (in-memory, per-IP, resets every 60 s)
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window (default)
const RATE_LIMIT_MAX_PUBLIC_FEED = 300; // public read-only signal feeds

// Public read-only signal endpoints — cached, safe to allow high-volume polling.
// Browsers + bots + CI share the same IP behind NAT, so a 60/min cap trivially
// flips to 429/403 (depending on upstream edge) and looks like "the API is broken".
const PUBLIC_FEED_PATHS = [
  "/api/signal-of-the-day",
  "/api/v1/signals",
  "/api/v1/health",
  "/api/v1/regime",
  "/api/signals",
  "/api/health",
  "/api/status",
];

function isPublicFeed(pathname: string): boolean {
  return PUBLIC_FEED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function isRateLimited(ip: string, pathname: string): boolean {
  const now = Date.now();
  const max = isPublicFeed(pathname)
    ? RATE_LIMIT_MAX_PUBLIC_FEED
    : RATE_LIMIT_MAX;
  const key = isPublicFeed(pathname) ? `feed:${ip}` : ip;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > max;
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

const ALL_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE"]);

const AUTH_RULES: AuthRule[] = [
  // /api/admin/* — all methods require auth
  { pattern: /^\/api\/admin(\/.*)?$/, methods: ALL_METHODS },
  // /api/debug-signals — internal engine diagnostics
  { pattern: "/api/debug-signals", methods: ALL_METHODS },
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
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  // CSP is in report-only mode for monitoring; flip to Content-Security-Policy to enforce
  response.headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
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

  // --- CORS preflight: always allow, never count against rate limit ---
  if (method === "OPTIONS" && pathname.startsWith("/api/")) {
    const res = new NextResponse(null, { status: 204 });
    res.headers.set("Access-Control-Allow-Origin", "*");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, HEAD, POST, PATCH, DELETE, OPTIONS",
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With",
    );
    res.headers.set("Access-Control-Max-Age", "86400");
    return applySecurityHeaders(res, pathname);
  }

  // --- Rate limiting for /api/ routes ---
  if (pathname.startsWith("/api/")) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";

    if (isRateLimited(ip, pathname)) {
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
      // Fail closed in production; fail open in dev with a warning.
      if (process.env.NODE_ENV === "production") {
        const res = NextResponse.json(
          { error: "Server misconfigured: ADMIN_SECRET not set" },
          { status: 503 },
        );
        return applySecurityHeaders(res, pathname);
      }
      if (!adminSecretWarningLogged) {
        console.warn(
          "[middleware] ADMIN_SECRET is not set. Admin routes are unprotected (dev mode only).",
        );
        adminSecretWarningLogged = true;
      }
    } else {
      // Check Bearer header (for external API calls)
      const authHeader = request.headers.get("authorization");
      const bearerToken = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;

      // Check httpOnly cookie (for browser sessions)
      const cookieToken = request.cookies.get("tc_admin")?.value ?? null;

      if (bearerToken !== adminSecret && cookieToken !== adminSecret) {
        // If it's a browser request (Accept: text/html), redirect to login
        const accept = request.headers.get("accept") ?? "";
        if (accept.includes("text/html")) {
          const loginUrl = new URL("/admin/login", request.url);
          loginUrl.searchParams.set("redirect", pathname);
          return NextResponse.redirect(loginUrl);
        }

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
