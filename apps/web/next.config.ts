import type { NextConfig } from "next";
import path from "path";

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
