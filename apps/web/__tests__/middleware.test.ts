import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { config } from "../middleware";

/**
 * Characterization test for the global middleware matcher.
 *
 * This asserts the CURRENT matcher coverage of apps/web/middleware.ts so that a
 * future (owner/Fatin-approved) middleware.ts -> proxy.ts convention migration
 * cannot silently change which requests receive auth / rate-limiting / security
 * headers. See docs/ai-improvement/middleware-proxy-migration-note.md.
 *
 * This file is test-only: it imports the existing `export const config` and
 * makes assertions. It does NOT change any runtime, auth, rate-limit, header, or
 * matcher behavior.
 *
 * NOTE: the doc references `unstable_doesProxyMatch`; the installed Next version
 * exposes `unstable_doesMiddlewareMatch`, which is what is used here.
 */
describe("middleware matcher characterization", () => {
  const matches = (url: string) =>
    unstable_doesMiddlewareMatch({ config, url });

  describe("included paths (middleware MUST run)", () => {
    const included = [
      "/api/health",
      "/api/admin",
      "/api/admin/signals",
      "/api/webhooks/deliver",
      "/dashboard",
      "/embed",
      "/embed/signal-card",
      "/",
    ];
    it.each(included)("matches %s", (url) => {
      expect(matches(url)).toBe(true);
    });
  });

  describe("excluded static assets (middleware MUST NOT run)", () => {
    const excluded = [
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/favicon.ico",
      "/sw.js",
      "/manifest.json",
    ];
    it.each(excluded)("does not match %s", (url) => {
      expect(matches(url)).toBe(false);
    });
  });
});
