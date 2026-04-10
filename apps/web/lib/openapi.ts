/**
 * Centralized OpenAPI 3.1 spec builder for TradeClaw.
 *
 * This module is the single source of truth for the public REST API
 * documentation. It is consumed by:
 *   - GET /api/openapi         (legacy path, kept for back-compat)
 *   - GET /api/openapi.json    (canonical path surfaced in docs)
 *   - GET /api/docs            (legacy path used by the existing docs UI)
 *   - apps/web/public/openapi.json (static snapshot shipped with the build)
 *
 * No runtime dependency on Zod or zod-to-openapi (neither is currently
 * in package.json). The spec is a plain object so it stays trivially
 * serializable and easy to diff in PRs.
 *
 * IMPORTANT: this module MUST NOT change the behavior of any existing
 * API route. It is documentation-only.
 */

export type OpenApiSpec = Record<string, unknown>;

const SERVERS = [
  { url: "https://tradeclaw.win", description: "Production" },
  { url: "http://localhost:3000", description: "Local development" },
];

const API_KEY_HEADER = "X-TradeClaw-Key";

/**
 * Build the full OpenAPI 3.1 document.
 *
 * Kept as a function (rather than a const) so callers can cheaply
 * regenerate a fresh object per-request without worrying about accidental
 * mutation of a shared reference.
 */
export function buildOpenApiSpec(): OpenApiSpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "TradeClaw REST API",
      version: "1.0.0",
      summary:
        "Programmatic access to TradeClaw trading signals, performance proof, widgets, and digests.",
      description:
        "TradeClaw is an open-source, self-hostable AI trading signal platform. " +
        "This document describes the stable v1 REST surface plus selected public " +
        "endpoints used by widgets, badges, and the daily digest. " +
        "Most read endpoints are public. Write endpoints and higher rate limits " +
        "require an API key — pass it via the `X-TradeClaw-Key` header or as a " +
        "bearer token in `Authorization: Bearer <key>`.",
      license: { name: "MIT", url: "https://opensource.org/licenses/MIT" },
      contact: {
        name: "TradeClaw",
        url: "https://github.com/naimkatiman/tradeclaw",
      },
    },
    servers: SERVERS,
    tags: [
      { name: "Signals", description: "Trading signals (v1 stable surface)" },
      { name: "Widgets", description: "Embeddable widgets and SVG cards" },
      { name: "Proof", description: "Historical performance proof data" },
      { name: "Digest", description: "Daily / weekly performance digests" },
      { name: "Meta", description: "Health, metrics, and discovery" },
    ],
    components: {
      securitySchemes: {
        ApiKeyHeader: {
          type: "apiKey",
          in: "header",
          name: API_KEY_HEADER,
          description:
            "API key issued via POST /api/keys. Include on every request that requires auth.",
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "TradeClaw API Key",
          description: "Alternative to the X-TradeClaw-Key header.",
        },
      },
      schemas: {
        Error: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", description: "Human-readable error message" },
            code: { type: "string", description: "Machine-readable error code" },
          },
        },
        Direction: { type: "string", enum: ["BUY", "SELL"] },
        Timeframe: {
          type: "string",
          enum: ["M5", "M15", "H1", "H4", "D1"],
          description: "Chart timeframe",
        },
        SignalV1: {
          type: "object",
          required: [
            "id",
            "pair",
            "direction",
            "confidence",
            "timeframe",
            "price",
            "generatedAt",
          ],
          properties: {
            id: { type: "string", example: "BTCUSD-H1-BUY-1711530000" },
            pair: { type: "string", example: "BTCUSD" },
            direction: { $ref: "#/components/schemas/Direction" },
            confidence: {
              type: "number",
              minimum: 0,
              maximum: 100,
              example: 82.5,
            },
            timeframe: { $ref: "#/components/schemas/Timeframe" },
            price: { type: "number", example: 67523.41 },
            tp: { type: "number", nullable: true, example: 68120.0 },
            sl: { type: "number", nullable: true, example: 66980.0 },
            rsi: { type: "number", nullable: true, example: 58.2 },
            macd: { type: "number", nullable: true, example: 12.7 },
            generatedAt: {
              type: "string",
              format: "date-time",
              example: "2026-04-09T12:24:00.000Z",
            },
            shareUrl: {
              type: "string",
              format: "uri",
              example: "https://tradeclaw.win/signal/BTCUSD-H1-BUY",
            },
          },
        },
        SignalListV1: {
          type: "object",
          required: ["ok", "version", "count", "signals"],
          properties: {
            ok: { type: "boolean" },
            version: { type: "string", example: "v1" },
            count: { type: "integer", example: 6 },
            total: { type: "integer", example: 23 },
            generatedAt: { type: "string", format: "date-time" },
            source: {
              type: "string",
              enum: ["live-file", "realtime"],
              description: "Where the signals were computed from",
            },
            engineVersion: { type: "string", example: "v4" },
            signals: {
              type: "array",
              items: { $ref: "#/components/schemas/SignalV1" },
            },
          },
        },
        ProofStats: {
          type: "object",
          properties: {
            totalSignals: { type: "integer" },
            realSignals: { type: "integer" },
            resolvedSignals: { type: "integer" },
            winRate4h: { type: "number" },
            winRate24h: { type: "number" },
            avgConfidence: { type: "number" },
            runningPnlPct: { type: "number" },
            totalWins: { type: "integer" },
            totalLosses: { type: "integer" },
            openSignals: { type: "integer" },
            lastUpdated: { type: "integer" },
          },
        },
        ProofResponse: {
          type: "object",
          properties: {
            stats: { $ref: "#/components/schemas/ProofStats" },
            signals: { type: "array", items: { type: "object" } },
          },
        },
        DigestResponse: {
          type: "object",
          description:
            "Daily digest payload. Returned as JSON when `format=json` or the Accept header prefers JSON; otherwise the endpoint returns rendered HTML.",
          properties: {
            period: { type: "string", enum: ["7d", "30d"] },
            generatedAt: { type: "string", format: "date-time" },
            topSignals: { type: "array", items: { type: "object" } },
            stats: { type: "object" },
          },
        },
        HealthResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            version: { type: "string" },
            uptime: { type: "number" },
            timestamp: { type: "string", format: "date-time" },
          },
        },
      },
    },
    // Most endpoints are public. Security is applied explicitly only on the
    // ones that require a key, so no top-level `security` array here.
    paths: {
      "/api/v1/signals": {
        get: {
          tags: ["Signals"],
          operationId: "listSignalsV1",
          summary: "List recent signals",
          description:
            "Returns the most recent high-confidence signals, optionally filtered by symbol, direction, and timeframe. " +
            "Prefers the Python-generated live signal file (engine v4); falls back to the realtime TA engine when stale.",
          parameters: [
            {
              name: "pair",
              in: "query",
              schema: { type: "string", example: "BTCUSD" },
              description:
                "Filter by trading pair. Aliased as `symbol` in some clients — use `pair`.",
            },
            {
              name: "symbol",
              in: "query",
              schema: { type: "string", example: "BTCUSD" },
              description: "Alias for `pair`.",
            },
            {
              name: "timeframe",
              in: "query",
              schema: { $ref: "#/components/schemas/Timeframe" },
            },
            {
              name: "direction",
              in: "query",
              schema: { $ref: "#/components/schemas/Direction" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", minimum: 1, maximum: 100, default: 20 },
              description: "Maximum signals to return (cap: 100).",
            },
            {
              name: "since",
              in: "query",
              schema: { type: "string", format: "date-time" },
              description:
                "ISO-8601 timestamp. Only signals generated at or after this time are returned.",
            },
            {
              name: "source",
              in: "query",
              schema: { type: "string", enum: ["live-file", "realtime"] },
              description:
                "Force the backing data source. Default is `live-file` with automatic fallback.",
            },
          ],
          responses: {
            "200": {
              description: "Signal list",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SignalListV1" },
                  examples: {
                    basic: {
                      summary: "BTC signals, live file",
                      value: {
                        ok: true,
                        version: "v1",
                        count: 2,
                        total: 2,
                        generatedAt: "2026-04-09T12:24:00.000Z",
                        source: "live-file",
                        engineVersion: "v4",
                        signals: [
                          {
                            id: "BTCUSD-H1-BUY-1711530000",
                            pair: "BTCUSD",
                            direction: "BUY",
                            confidence: 82.5,
                            timeframe: "H1",
                            price: 67523.41,
                            tp: 68120.0,
                            sl: 66980.0,
                            rsi: 58.2,
                            macd: 12.7,
                            generatedAt: "2026-04-09T12:24:00.000Z",
                            shareUrl:
                              "https://tradeclaw.win/signal/BTCUSD-H1-BUY",
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/signals/{id}": {
        get: {
          tags: ["Signals"],
          operationId: "getSignalV1",
          summary: "Get a single signal by ID (optional)",
          description:
            "Convenience lookup for a single signal by its deterministic ID. " +
            "Implemented by filtering the list endpoint; kept here for clients that prefer URL-addressable resources.",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
              example: "BTCUSD-H1-BUY-1711530000",
            },
          ],
          responses: {
            "200": {
              description: "Signal found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SignalV1" },
                },
              },
            },
            "404": {
              description: "Not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/widget/profile": {
        get: {
          tags: ["Widgets"],
          operationId: "getWidgetProfile",
          summary: "Signal profile card (SVG)",
          description:
            "Returns an SVG card showing the latest H1 signal for a given pair. " +
            "Designed to be embeddable in GitHub READMEs and other Markdown surfaces.",
          parameters: [
            {
              name: "pair",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "BTCUSD",
                  "ETHUSD",
                  "XAUUSD",
                  "XAGUSD",
                  "EURUSD",
                  "GBPUSD",
                  "USDJPY",
                  "AUDUSD",
                  "USDCAD",
                  "XRPUSD",
                ],
                default: "BTCUSD",
              },
            },
            {
              name: "theme",
              in: "query",
              schema: { type: "string", enum: ["dark", "light"], default: "dark" },
            },
          ],
          responses: {
            "200": {
              description: "SVG card",
              content: {
                "image/svg+xml": {
                  schema: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
      },
      "/api/proof": {
        get: {
          tags: ["Proof"],
          operationId: "getProof",
          summary: "Historical performance proof",
          description:
            "Returns aggregated win-rate and PnL statistics plus the most recent real (non-simulated) signals with their 4h and 24h outcomes. " +
            "This is the public audit trail behind TradeClaw's win-rate claims.",
          responses: {
            "200": {
              description: "Proof payload",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ProofResponse" },
                },
              },
            },
            "500": {
              description: "Failed to load proof data",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/digest/preview": {
        get: {
          tags: ["Digest"],
          operationId: "previewDigest",
          summary: "Email digest preview",
          description:
            "Returns the rendered HTML for the daily / weekly email digest. Pass `format=json` or `Accept: application/json` to receive the structured payload instead.",
          parameters: [
            {
              name: "period",
              in: "query",
              schema: { type: "string", enum: ["7d", "30d"], default: "7d" },
            },
            {
              name: "format",
              in: "query",
              schema: { type: "string", enum: ["json", "html"] },
              description: "Force a response format. Defaults to HTML.",
            },
          ],
          responses: {
            "200": {
              description: "Digest",
              content: {
                "text/html": { schema: { type: "string" } },
                "application/json": {
                  schema: { $ref: "#/components/schemas/DigestResponse" },
                },
              },
            },
          },
        },
      },
      "/api/health": {
        get: {
          tags: ["Meta"],
          operationId: "health",
          summary: "Health check",
          responses: {
            "200": {
              description: "Server health",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
          },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Meta"],
          operationId: "getOpenApiSpec",
          summary: "Fetch this OpenAPI document",
          description:
            "Returns the OpenAPI 3.1 document that describes the TradeClaw REST API. " +
            "Use this with tools like Scalar, Swagger UI, or Redoc.",
          responses: {
            "200": {
              description: "OpenAPI 3.1 document",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  };
}

/**
 * Convenience export used by the interactive docs page.
 * Computing once per import is fine because the spec is pure data.
 */
export const openApiSpec: OpenApiSpec = buildOpenApiSpec();
