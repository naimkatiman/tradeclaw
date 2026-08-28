import type { NextConfig } from "next";
import path from "path";

// The repository still contains experimental and historical surfaces used by
// maintainers, but the hosted product has one public journey: Evidence → Lab →
// Build. Retire action, gamification, and overlapping marketing routes at the
// edge so a direct legacy URL cannot contradict the failed evidence gate.
const retiredPublicRoutes = [
  { source: '/developer', destination: '/api-docs' },
  { source: '/examples', destination: '/docs/api' },
  { source: '/notion/signals', destination: '/docs/api' },
  { source: '/demo/telegram', destination: '/track-record' },
  { source: '/telegram', destination: '/docs' },
  { source: '/alerts/:path*', destination: '/dashboard' },
  { source: '/alert/:path*', destination: '/track-record' },
  { source: '/notifications', destination: '/dashboard' },
  { source: '/sms', destination: '/dashboard' },
  { source: '/subscribe', destination: '/track-record' },
  { source: '/waitlist', destination: '/track-record' },
  { source: '/digest/:path*', destination: '/track-record' },
  { source: '/paper-trading', destination: '/backtest' },
  { source: '/portfolio', destination: '/backtest' },
  { source: '/leaderboard', destination: '/research' },
  { source: '/strategies/leaderboard', destination: '/research' },
  { source: '/tournament', destination: '/research' },
  { source: '/vote', destination: '/research' },
  { source: '/star', destination: '/start' },
  { source: '/star-history', destination: '/start' },
  { source: '/producthunt', destination: '/start' },
  { source: '/users', destination: '/start' },
  { source: '/pledge', destination: '/start' },
  { source: '/sponsor', destination: '/start' },
  { source: '/sponsors', destination: '/start' },
  { source: '/pricing', destination: '/start' },
  { source: '/widgets', destination: '/open-data' },
  { source: '/profile-widget', destination: '/open-data' },
  { source: '/badges/readme', destination: '/open-data' },
  { source: '/card', destination: '/open-data' },
  { source: '/embed/live', destination: '/open-data' },
  { source: '/today', destination: '/dashboard' },
  { source: '/live', destination: '/dashboard' },
  { source: '/performance', destination: '/track-record' },
  { source: '/proof', destination: '/track-record' },
  { source: '/calibration', destination: '/methodology' },
  { source: '/report', destination: '/track-record' },
  { source: '/benchmark', destination: '/track-record/study' },
  { source: '/confidence', destination: '/methodology' },
  { source: '/consensus', destination: '/dashboard' },
  { source: '/heatmap', destination: '/screener' },
  { source: '/sentiment', destination: '/screener' },
  { source: '/copilot', destination: '/backtest' },
  { source: '/roast', destination: '/backtest' },
  { source: '/compare', destination: '/research' },
  { source: '/strategies', destination: '/research' },
  { source: '/strategies/comparison', destination: '/research' },
  { source: '/strategies/marketplace', destination: '/research' },
  { source: '/marketplace/providers', destination: '/data-freshness' },
  { source: '/exchanges', destination: '/data-freshness' },
  { source: '/brokers', destination: '/data-freshness' },
  { source: '/chrome-extension', destination: '/docs' },
  { source: '/github-action', destination: '/docs' },
  { source: '/pine-to-tradeclaw', destination: '/docs' },
  { source: '/tradingview-export', destination: '/docs' },
  { source: '/hub', destination: '/dashboard' },
  { source: '/tools', destination: '/dashboard' },
  { source: '/journal', destination: '/backtest' },
  { source: '/patterns', destination: '/screener' },
  { source: '/indicators/builder', destination: '/backtest' },
  { source: '/api-usage', destination: '/docs/api' },
  { source: '/supabase', destination: '/docs/self-hosting' },
  { source: '/accuracy', destination: '/track-record' },
  { source: '/results', destination: '/track-record' },
  { source: '/weekly', destination: '/track-record' },
  { source: '/wrapped', destination: '/track-record' },
  { source: '/badge', destination: '/open-data' },
  { source: '/badges', destination: '/open-data' },
  { source: '/embed/:path*', destination: '/open-data' },
  { source: '/widget/:path*', destination: '/open-data' },
  { source: '/portfolio-widget', destination: '/open-data' },
  { source: '/rss', destination: '/open-data' },
  { source: '/share', destination: '/track-record' },
  { source: '/faq', destination: '/methodology' },
  { source: '/explain', destination: '/methodology' },
  { source: '/how-it-works', destination: '/methodology' },
  { source: '/risk', destination: '/methodology' },
  { source: '/rules', destination: '/methodology' },
  { source: '/quiz', destination: '/methodology' },
  { source: '/game-plan', destination: '/methodology' },
  { source: '/action', destination: '/methodology' },
  { source: '/allocation', destination: '/methodology' },
  { source: '/correlation', destination: '/screener' },
  { source: '/calendar', destination: '/screener' },
  { source: '/multi-timeframe', destination: '/screener' },
  { source: '/replay', destination: '/backtest' },
  { source: '/backtest/upload', destination: '/backtest' },
  { source: '/strategy-builder', destination: '/backtest' },
  { source: '/strategy-rules', destination: '/backtest' },
  { source: '/playground', destination: '/backtest' },
  { source: '/regime', destination: '/research' },
  { source: '/marketplace', destination: '/research' },
  { source: '/earningsedge/:path*', destination: '/research' },
  { source: '/vs-tradingview', destination: '/research' },
  { source: '/awesome', destination: '/start' },
  { source: '/showcase', destination: '/start' },
  { source: '/launch', destination: '/start' },
  { source: '/roadmap', destination: '/start' },
  { source: '/contribute', destination: '/start' },
  { source: '/contributors', destination: '/start' },
  { source: '/stars', destination: '/start' },
  { source: '/readme-score', destination: '/start' },
  { source: '/og-preview', destination: '/start' },
  { source: '/devto', destination: '/start' },
  { source: '/hn', destination: '/start' },
  { source: '/threads', destination: '/start' },
  { source: '/post-thread', destination: '/start' },
  { source: '/commentary', destination: '/start' },
  { source: '/email-digest', destination: '/docs' },
  { source: '/discord/:path*', destination: '/docs' },
  { source: '/slack', destination: '/docs' },
  { source: '/tradingview-alerts', destination: '/docs' },
  { source: '/zapier', destination: '/docs' },
  { source: '/plugins', destination: '/docs' },
  { source: '/status', destination: '/data-freshness' },
  { source: '/news', destination: '/why-long-term' },
] as const;

const nextConfig: NextConfig = {
  output: "standalone",

  // Pin the workspace root to THIS checkout. Without it, Turbopack walks up
  // to the nearest lockfile; from a .claude/worktrees checkout that resolves
  // to the parent repo and Turbopack scans every worktree (dev server hangs
  // at multi-GB memory).
  turbopack: {
    root: path.join(__dirname, "../.."),
    resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },

  // Bundle MDX blog content into the standalone build so the dynamic blog
  // route and sitemap can read frontmatter at runtime if SSG falls back.
  outputFileTracingIncludes: {
    "/blog/**": ["./content/blog/**"],
    "/sitemap.xml": ["./content/blog/**"],
  },

  // Transpile workspace packages
  transpilePackages: ["@tradeclaw/signals"],

  // Skip TypeScript type-check during build (tsc runs separately via lint/CI)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Performance: compress responses
  compress: true,

  // Security: hide framework version from response headers
  poweredByHeader: false,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/signals',
        destination: '/screener',
        permanent: true,
      },
      {
        source: '/fly',
        destination: '/start',
        permanent: false,
      },
      {
        source: '/replit',
        destination: '/start',
        permanent: false,
      },
      ...retiredPublicRoutes.map((route) => ({ ...route, permanent: true })),
    ];
  },

  // Security headers for better Lighthouse score
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
      // Static assets: aggressive caching
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|webp|avif|woff|woff2|ttf|otf)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // SVG assets
      {
        source: "/(.*)\\.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      // API: no caching by default
      {
        source: "/api/(.*)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      // SSE endpoints: must not buffer
      {
        source: "/api/prices/stream",
        headers: [
          { key: "X-Accel-Buffering", value: "no" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },

  // Compiler options
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },

  // Experimental performance features
  experimental: {
    optimizeCss: false, // critters not installed; set true after: npm i critters
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
