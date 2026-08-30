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

import {
  SYSTEMATIC_RESEARCH_INTAKE,
  summarizeResearchIntake,
} from './research-intake';
import { summarizeResearchIntakeEvidenceStates } from './research-intake-evidence-state';

export type OpenApiSpec = Record<string, unknown>;

const SERVERS = [
  { url: "https://tradeclaw.win", description: "Production" },
  { url: "http://localhost:3000", description: "Local development" },
];

const API_KEY_HEADER = "X-TradeClaw-Key";

const OPENAPI_RESEARCH_CATALOG = SYSTEMATIC_RESEARCH_INTAKE;
const OPENAPI_RESEARCH_EVIDENCE = OPENAPI_RESEARCH_CATALOG.filter(
  (record) => record.tradeClawSourceAudit !== null || record.tradeClawEvidence !== null,
);
const OPENAPI_RESEARCH_CATALOG_SUMMARY = summarizeResearchIntake(
  OPENAPI_RESEARCH_CATALOG,
);
const OPENAPI_RESEARCH_EVIDENCE_SUMMARY = summarizeResearchIntake(
  OPENAPI_RESEARCH_EVIDENCE,
);
const OPENAPI_RESEARCH_CATALOG_EVIDENCE_SUMMARY =
  summarizeResearchIntakeEvidenceStates(OPENAPI_RESEARCH_CATALOG);
const OPENAPI_RESEARCH_CATALOG_COUNT = OPENAPI_RESEARCH_CATALOG.length;
const OPENAPI_RESEARCH_EVIDENCE_COUNT = OPENAPI_RESEARCH_EVIDENCE.length;
const OPENAPI_RESEARCH_SOURCE_POSITION_MAXIMUM = Math.max(
  0,
  OPENAPI_RESEARCH_CATALOG_COUNT - 1,
);

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
        "Programmatic access to TradeClaw rule-generated research records, outcome-study summaries, widgets, and digests.",
      description:
        "TradeClaw is an open-source, self-hostable rule-based market research platform. " +
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
      { name: "Signals", description: "Rule-generated research candidates (v1 stable surface)" },
      { name: "Research", description: "Pinned systematic-research catalog and evidence overlays" },
      { name: "Widgets", description: "Embeddable widgets and SVG cards" },
      { name: "Proof", description: "OHLCV-resolved signal-outcome study data; not broker or portfolio results" },
      { name: "Digest", description: "Daily / weekly recorded-signal digests" },
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
              description:
                "Legacy field name for the engine's mechanical rule/confluence score, expressed from 0 to 100. It is not a calibrated probability, expected return, or evidence of edge.",
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
            avgConfidence: {
              type: "number",
              description:
                "Mean mechanical rule/confluence score for the included records. This is not a calibrated probability or edge estimate.",
            },
            runningPnlPct: {
              type: "number",
              description:
                "Legacy field name for the mean unsized 24h directional price move across counted outcomes. It is not broker, account, or portfolio P&L.",
            },
            totalWins: { type: "integer" },
            totalLosses: { type: "integer" },
            openSignals: { type: "integer" },
            lastUpdated: { type: "integer" },
          },
        },
        ProofResponse: {
          type: "object",
          required: ["stats", "signals", "methodology", "window"],
          properties: {
            stats: { $ref: "#/components/schemas/ProofStats" },
            signals: { type: "array", items: { type: "object" } },
            methodology: {
              type: "object",
              required: ["population", "score", "runningPnlPct"],
              properties: {
                population: { type: "string" },
                score: { type: "string" },
                runningPnlPct: { type: "string" },
              },
            },
            window: {
              type: "object",
              required: [
                "sourceRecordsLoaded",
                "sourceReadLimit",
                "potentiallyTruncatedBeforeStart",
              ],
              properties: {
                sourceRecordsLoaded: { type: "integer" },
                sourceReadLimit: { type: "integer" },
                potentiallyTruncatedBeforeStart: { type: "boolean" },
              },
            },
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
        ResearchIntakePublicResources: {
          type: "object",
          description:
            "Canonical sibling resources for the public systematic-research intake. Every path is read-only and requires no API key.",
          required: [
            "overview",
            "evidenceBrief",
            "catalog",
            "catalogCsv",
            "evidenceIndex",
            "evidenceIndexBrief",
            "evidence",
            "evidenceCsv",
          ],
          properties: {
            overview: { type: "string", const: "/api/research/intake/overview" },
            evidenceBrief: {
              type: "string",
              const: "/api/research/intake/brief.md",
            },
            catalog: { type: "string", const: "/api/research/intake" },
            catalogCsv: { type: "string", const: "/api/research/intake.csv" },
            evidenceIndex: {
              type: "string",
              const: "/api/research/intake/evidence/index",
            },
            evidenceIndexBrief: {
              type: "string",
              const: "/api/research/intake/evidence/index.md",
            },
            evidence: { type: "string", const: "/api/research/intake/evidence" },
            evidenceCsv: {
              type: "string",
              const: "/api/research/intake/evidence.csv",
            },
          },
        },
        ResearchIntakeStartHere: {
          type: "object",
          description:
            "One server-authored, evidence-first public navigation action. It is convenience guidance, not a strategy recommendation, evidence claim, publication approval, or trading authority.",
          required: [
            "audience",
            "kind",
            "label",
            "reason",
            "href",
            "targetResource",
            "targetIsCurrentResource",
            "itemCount",
            "automaticAction",
            "grantsPublicationAuthority",
            "grantsTradingAuthority",
          ],
          properties: {
            audience: { type: "string", const: "public" },
            kind: {
              type: "string",
              enum: ["browse-evidence-index", "inspect-complete-evidence"],
            },
            label: {
              type: "string",
              example: `Browse ${OPENAPI_RESEARCH_EVIDENCE_COUNT} examined candidates`,
            },
            reason: {
              type: "string",
              description:
                "Explains why the complete source-ordered list or already-open evidence desk is the safe first view.",
            },
            href: {
              type: "string",
              enum: [
                "/api/research/intake/evidence/index",
                "/api/research/intake/evidence",
              ],
            },
            targetResource: {
              type: "string",
              enum: ["evidence-index", "evidence"],
              description: "Stable identity of the resource targeted by this action.",
            },
            targetIsCurrentResource: {
              type: "boolean",
              description:
                "True only when this response already represents the targeted evidence resource, so clients can avoid a circular next-link treatment.",
            },
            itemCount: {
              type: "integer",
              const: OPENAPI_RESEARCH_EVIDENCE_COUNT,
            },
            automaticAction: { type: "boolean", const: false },
            grantsPublicationAuthority: { type: "boolean", const: false },
            grantsTradingAuthority: { type: "boolean", const: false },
          },
        },
        ResearchIntakePublicRecordLinks: {
          type: "object",
          description:
            "Canonical machine-readable and human-readable public detail links for one exact candidate ID.",
          required: ["candidate", "candidateBrief"],
          properties: {
            candidate: {
              type: "string",
              example:
                "/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation",
            },
            candidateBrief: {
              type: "string",
              description: "Deterministic human-readable Markdown for the same exact candidate.",
              example:
                "/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation/brief.md",
            },
          },
        },
        ResearchIntakePublicRecord: {
          type: "object",
          description:
            "One field-allow-listed source candidate with its safe TradeClaw source-audit or replication overlay, when one exists.",
          required: [
            "id",
            "title",
            "sourceUrl",
            "assetClass",
            "upstreamGrossSharpe",
            "upstreamTStatistic",
            "upstreamVolatilityPct",
            "upstreamYearsTested",
            "sourcePosition",
            "discoveryBasis",
            "stage",
            "verdict",
            "costStatus",
            "evidenceBasis",
            "evidenceState",
            "links",
            "tradeClawSourceAudit",
            "tradeClawEvidence",
          ],
          properties: {
            id: {
              type: "string",
              example: "a-risk-based-approach-to-tactical-asset-allocation",
            },
            title: { type: "string" },
            sourceUrl: { type: "string", format: "uri" },
            assetClass: { type: "string" },
            upstreamGrossSharpe: { type: "number" },
            upstreamTStatistic: { type: "number" },
            upstreamVolatilityPct: { type: "number" },
            upstreamYearsTested: { type: "number" },
            sourcePosition: {
              type: "integer",
              minimum: 0,
              maximum: OPENAPI_RESEARCH_SOURCE_POSITION_MAXIMUM,
            },
            discoveryBasis: { type: "string", const: "upstream-gross-metadata" },
            stage: { type: "string" },
            verdict: { type: "string" },
            costStatus: { type: "string" },
            evidenceBasis: {
              type: "string",
              enum: [
                "upstream-gross-discovery-only",
                "tradeclaw-source-audit-only",
                "tradeclaw-replication-record",
              ],
            },
            evidenceState: {
              type: "object",
              description:
                "Display-ready, claim-safe interpretation shared by public and protected candidate records.",
              required: [
                "performanceEvidenceStatus",
                "label",
                "meaning",
                "performanceGatesEvaluated",
                "taskId",
                "decisionSummary",
                "evidenceRecordedOn",
                "evidencePath",
                "artifactPath",
                "grantsPublicationAuthority",
                "grantsTradingAuthority",
              ],
              properties: {
                performanceEvidenceStatus: {
                  type: "string",
                  enum: [
                    "not-tested",
                    "source-audit-only-no-local-backtest",
                    "qa-only-no-performance-result",
                    "modeled-historical-pass",
                    "modeled-historical-fail",
                    "modeled-historical-inconclusive",
                  ],
                },
                label: { type: "string" },
                meaning: { type: "string" },
                performanceGatesEvaluated: { type: "boolean" },
                taskId: { type: ["string", "null"] },
                decisionSummary: {
                  type: ["string", "null"],
                  maxLength: 320,
                  description:
                    "Canonical candidate-specific TradeClaw decision reason, or null when the discovery has no TradeClaw source audit or replication.",
                },
                evidenceRecordedOn: {
                  type: ["string", "null"],
                  format: "date",
                  description:
                    "Canonical source-audit date or replication study date, or null for an untouched discovery.",
                },
                evidencePath: { type: ["string", "null"] },
                artifactPath: { type: ["string", "null"] },
                grantsPublicationAuthority: { type: "boolean", const: false },
                grantsTradingAuthority: { type: "boolean", const: false },
              },
            },
            links: {
              $ref: "#/components/schemas/ResearchIntakePublicRecordLinks",
            },
            tradeClawSourceAudit: { type: ["object", "null"] },
            tradeClawEvidence: { type: ["object", "null"] },
          },
        },
        ResearchIntakeEvidenceStateSummary: {
          type: "object",
          description:
            "Ordered plain-language counts from the same evidence-state classifier used by every candidate record. Source-audit and QA-only records are kept separate from evaluated modeled performance.",
          required: [
            "totalCandidates",
            "withTradeClawRecord",
            "performanceGatesEvaluated",
            "performanceGatesNotEvaluated",
            "plainLanguageSummary",
            "statuses",
            "grantsPublicationAuthority",
            "grantsTradingAuthority",
          ],
          properties: {
            totalCandidates: { type: "integer", minimum: 0 },
            withTradeClawRecord: { type: "integer", minimum: 0 },
            performanceGatesEvaluated: { type: "integer", minimum: 0 },
            performanceGatesNotEvaluated: { type: "integer", minimum: 0 },
            plainLanguageSummary: {
              type: "string",
              description:
                "Presentation-ready interpretation generated from the same ordered counts; it adds no evidence or authority.",
            },
            statuses: {
              type: "array",
              minItems: 6,
              maxItems: 6,
              description:
                "All six statuses in stable decision order, including zero-count states.",
              items: {
                type: "object",
                required: [
                  "performanceEvidenceStatus",
                  "label",
                  "meaning",
                  "count",
                  "performanceGatesEvaluated",
                ],
                properties: {
                  performanceEvidenceStatus: {
                    type: "string",
                    enum: [
                      "not-tested",
                      "source-audit-only-no-local-backtest",
                      "qa-only-no-performance-result",
                      "modeled-historical-pass",
                      "modeled-historical-fail",
                      "modeled-historical-inconclusive",
                    ],
                  },
                  label: { type: "string" },
                  meaning: { type: "string" },
                  count: { type: "integer", minimum: 0 },
                  performanceGatesEvaluated: { type: "boolean" },
                },
              },
            },
            grantsPublicationAuthority: { type: "boolean", const: false },
            grantsTradingAuthority: { type: "boolean", const: false },
          },
        },
        ResearchIntakeResponse: {
          type: "object",
          description:
            "Public, deterministic projection of the pinned systematic-research catalog. Admin timing, next-action, and marketing workflow fields are excluded.",
          required: [
            "schemaVersion",
            "access",
            "resources",
            "startHere",
            "source",
            "selectionPolicy",
            "workflow",
            "claimBoundary",
            "catalogSummary",
            "catalogEvidenceStateSummary",
            "records",
          ],
          properties: {
            schemaVersion: { type: "integer", const: 1 },
            access: {
              type: "object",
              required: [
                "mode",
                "requiresAuthentication",
                "requiresApiKey",
                "grantsPublicationAuthority",
                "grantsTradingAuthority",
              ],
              properties: {
                mode: { type: "string", const: "public-read-only" },
                requiresAuthentication: { type: "boolean", const: false },
                requiresApiKey: { type: "boolean", const: false },
                grantsPublicationAuthority: { type: "boolean", const: false },
                grantsTradingAuthority: { type: "boolean", const: false },
              },
            },
            resources: {
              $ref: "#/components/schemas/ResearchIntakePublicResources",
            },
            startHere: {
              $ref: "#/components/schemas/ResearchIntakeStartHere",
            },
            source: {
              type: "object",
              description: "Pinned awesome-systematic-trading source receipt",
              required: [
                "repository",
                "commit",
                "readmeSha256",
                "snapshotDate",
                "reportedPerformanceBasis",
                "tradeClawTreatment",
              ],
              properties: {
                repository: { type: "string", format: "uri" },
                commit: { type: "string" },
                readmeSha256: { type: "string" },
                snapshotDate: { type: "string", format: "date" },
                reportedPerformanceBasis: {
                  type: "string",
                  const: "gross-of-trading-costs",
                },
                tradeClawTreatment: { type: "string", const: "discovery-only" },
              },
            },
            selectionPolicy: { type: "string" },
            workflow: {
              type: "array",
              items: {
                type: "object",
                required: ["stage", "exitGate"],
                properties: {
                  stage: {
                    type: "string",
                    enum: [
                      "discovered",
                      "source-audited",
                      "preregistered",
                      "replicated",
                      "prospective",
                    ],
                  },
                  exitGate: { type: "string" },
                },
              },
            },
            claimBoundary: {
              type: "object",
              required: ["upstreamMetrics", "sourceAudit", "replication", "authority"],
              properties: {
                upstreamMetrics: { type: "string" },
                sourceAudit: { type: "string" },
                replication: { type: "string" },
                authority: { type: "string" },
              },
            },
            catalogSummary: {
              type: "object",
              description: "Whole-catalog stage and verdict counts",
              required: [
                "total",
                "discovered",
                "sourceAudited",
                "preregistered",
                "replicated",
                "prospective",
                "passed",
                "failed",
                "inconclusive",
                "untested",
                "sourceNoGo",
                "byAssetClass",
              ],
              properties: {
                total: { type: "integer", example: OPENAPI_RESEARCH_CATALOG_SUMMARY.total },
                discovered: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.discovered,
                },
                sourceAudited: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.sourceAudited,
                },
                preregistered: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.preregistered,
                },
                replicated: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.replicated,
                },
                prospective: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.prospective,
                },
                passed: { type: "integer", example: OPENAPI_RESEARCH_CATALOG_SUMMARY.passed },
                failed: { type: "integer", example: OPENAPI_RESEARCH_CATALOG_SUMMARY.failed },
                inconclusive: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.inconclusive,
                },
                untested: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.untested,
                },
                sourceNoGo: {
                  type: "integer",
                  example: OPENAPI_RESEARCH_CATALOG_SUMMARY.sourceNoGo,
                },
                byAssetClass: {
                  type: "object",
                  additionalProperties: { type: "integer" },
                },
              },
            },
            catalogEvidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Whole-catalog interpretation: ${OPENAPI_RESEARCH_CATALOG_EVIDENCE_SUMMARY.plainLanguageSummary}`,
            },
            records: {
              type: "array",
              minItems: OPENAPI_RESEARCH_CATALOG_COUNT,
              maxItems: OPENAPI_RESEARCH_CATALOG_COUNT,
              items: { $ref: "#/components/schemas/ResearchIntakePublicRecord" },
            },
          },
        },
        ResearchIntakeOverviewResponse: {
          type: "object",
          description:
            `Compact, record-free orientation for the ${OPENAPI_RESEARCH_CATALOG_COUNT}-candidate catalog and complete ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record evidence subset. It retains the evidence interpretation, claim boundaries, and safe next resource without transferring candidate bodies.`,
          required: [
            "schemaVersion",
            "access",
            "resources",
            "startHere",
            "source",
            "selectionPolicy",
            "workflow",
            "claimBoundary",
            "catalogSummary",
            "catalogEvidenceStateSummary",
            "evidenceSummary",
            "evidenceStateSummary",
          ],
          properties: {
            schemaVersion: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/schemaVersion",
            },
            access: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/access" },
            resources: {
              $ref: "#/components/schemas/ResearchIntakePublicResources",
            },
            startHere: {
              $ref: "#/components/schemas/ResearchIntakeStartHere",
            },
            source: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/source" },
            selectionPolicy: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/selectionPolicy",
            },
            workflow: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/workflow",
            },
            claimBoundary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/claimBoundary",
            },
            catalogSummary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/catalogSummary",
            },
            catalogEvidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Whole ${OPENAPI_RESEARCH_CATALOG_COUNT}-candidate evidence interpretation.`,
            },
            evidenceSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceResponse/properties/evidenceSummary",
            },
            evidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Interpretation of the complete ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record evidence subset only.`,
            },
          },
        },
        ResearchIntakeEvidenceIndexState: {
          type: "object",
          description:
            "Compact candidate-level evidence classification. Meanings and false authority remain available once in the response summaries instead of being repeated per item.",
          required: [
            "performanceEvidenceStatus",
            "label",
            "performanceGatesEvaluated",
            "taskId",
            "decisionSummary",
            "evidenceRecordedOn",
          ],
          properties: {
            performanceEvidenceStatus: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/evidenceState/properties/performanceEvidenceStatus",
            },
            label: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/evidenceState/properties/label",
            },
            performanceGatesEvaluated: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/evidenceState/properties/performanceGatesEvaluated",
            },
            taskId: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/evidenceState/properties/taskId",
            },
            decisionSummary: {
              type: "string",
              minLength: 1,
              maxLength: 320,
              description:
                "Candidate-specific reason derived from the canonical TradeClaw source-audit or replication record. It is explanatory evidence copy, not a recommendation or authority.",
            },
            evidenceRecordedOn: {
              type: "string",
              format: "date",
              description:
                "Canonical source-audit date or replication study date for this examined candidate.",
            },
          },
        },
        ResearchIntakeEvidenceIndexCandidate: {
          type: "object",
          description:
            "Identity and claim-safe classification needed to choose one exact candidate detail resource. Upstream performance figures and nested evidence bodies are omitted.",
          required: [
            "id",
            "title",
            "assetClass",
            "sourcePosition",
            "stage",
            "verdict",
            "costStatus",
            "evidenceBasis",
            "evidenceState",
          ],
          properties: {
            id: { $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/id" },
            title: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/title",
            },
            assetClass: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/assetClass",
            },
            sourcePosition: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/sourcePosition",
            },
            stage: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/stage",
            },
            verdict: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/verdict",
            },
            costStatus: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/costStatus",
            },
            evidenceBasis: {
              $ref: "#/components/schemas/ResearchIntakePublicRecord/properties/evidenceBasis",
            },
            evidenceState: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceIndexState",
            },
          },
        },
        ResearchIntakeEvidenceIndexItem: {
          type: "object",
          required: ["evidencePosition", "candidate", "links"],
          properties: {
            evidencePosition: {
              type: "integer",
              minimum: 1,
              maximum: OPENAPI_RESEARCH_EVIDENCE_COUNT,
            },
            candidate: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceIndexCandidate",
            },
            links: {
              $ref: "#/components/schemas/ResearchIntakePublicRecordLinks",
            },
          },
        },
        ResearchIntakeEvidenceIndexResponse: {
          type: "object",
          description:
            `Lightweight, deterministic list of all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} examined candidates in pinned source order. It supplies exact detail links without repeating source audits or replication bodies.`,
          required: [
            "schemaVersion",
            "access",
            "resources",
            "startHere",
            "source",
            "selectionPolicy",
            "workflow",
            "claimBoundary",
            "catalogSummary",
            "catalogEvidenceStateSummary",
            "evidenceSummary",
            "evidenceStateSummary",
            "evidenceIndex",
            "items",
          ],
          properties: {
            schemaVersion: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/schemaVersion",
            },
            access: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/access" },
            resources: {
              $ref: "#/components/schemas/ResearchIntakePublicResources",
            },
            startHere: {
              $ref: "#/components/schemas/ResearchIntakeStartHere",
            },
            source: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/source" },
            selectionPolicy: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/selectionPolicy",
            },
            workflow: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/workflow",
            },
            claimBoundary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/claimBoundary",
            },
            catalogSummary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/catalogSummary",
            },
            catalogEvidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
            },
            evidenceSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceResponse/properties/evidenceSummary",
            },
            evidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
            },
            evidenceIndex: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceResponse/properties/evidenceIndex",
            },
            items: {
              type: "array",
              minItems: OPENAPI_RESEARCH_EVIDENCE_COUNT,
              maxItems: OPENAPI_RESEARCH_EVIDENCE_COUNT,
              items: {
                $ref: "#/components/schemas/ResearchIntakeEvidenceIndexItem",
              },
            },
          },
        },
        ResearchIntakeEvidenceResponse: {
          type: "object",
          description:
            `Public, deterministic index of all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} candidates with a TradeClaw source-audit or replication overlay. Records remain in pinned source order and include failures, no-go audits, and the inconclusive run.`,
          required: [
            "schemaVersion",
            "access",
            "resources",
            "startHere",
            "source",
            "selectionPolicy",
            "workflow",
            "claimBoundary",
            "catalogSummary",
            "catalogEvidenceStateSummary",
            "evidenceIndex",
            "evidenceSummary",
            "evidenceStateSummary",
            "records",
          ],
          properties: {
            schemaVersion: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/schemaVersion",
            },
            access: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/access" },
            resources: {
              $ref: "#/components/schemas/ResearchIntakePublicResources",
            },
            startHere: {
              $ref: "#/components/schemas/ResearchIntakeStartHere",
            },
            source: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/source" },
            selectionPolicy: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/selectionPolicy",
            },
            workflow: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/workflow",
            },
            claimBoundary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/claimBoundary",
            },
            catalogSummary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/catalogSummary",
            },
            catalogEvidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Whole ${OPENAPI_RESEARCH_CATALOG_COUNT}-candidate interpretation. This is deliberately separate from the ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record evidenceStateSummary below.`,
            },
            evidenceIndex: {
              type: "object",
              required: [
                "selection",
                "order",
                "performanceRanked",
                "includesEveryAvailableOverlay",
              ],
              properties: {
                selection: {
                  type: "string",
                  const: "all-candidates-with-tradeclaw-source-audit-or-replication",
                },
                order: { type: "string", const: "pinned-source-order" },
                performanceRanked: { type: "boolean", const: false },
                includesEveryAvailableOverlay: { type: "boolean", const: true },
              },
            },
            evidenceSummary: {
              allOf: [
                {
                  $ref: "#/components/schemas/ResearchIntakeResponse/properties/catalogSummary",
                },
                {
                  description:
                    `Stage and verdict counts for the complete ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record index`,
                  properties: {
                    total: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.total },
                    discovered: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.discovered },
                    sourceAudited: {
                      example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.sourceAudited,
                    },
                    preregistered: {
                      example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.preregistered,
                    },
                    replicated: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.replicated },
                    prospective: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.prospective },
                    passed: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.passed },
                    failed: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.failed },
                    inconclusive: {
                      example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.inconclusive,
                    },
                    untested: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.untested },
                    sourceNoGo: { example: OPENAPI_RESEARCH_EVIDENCE_SUMMARY.sourceNoGo },
                  },
                },
              ],
            },
            evidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Interpretation of the complete ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record evidence subset only.`,
            },
            records: {
              type: "array",
              minItems: OPENAPI_RESEARCH_EVIDENCE_COUNT,
              maxItems: OPENAPI_RESEARCH_EVIDENCE_COUNT,
              items: { $ref: "#/components/schemas/ResearchIntakePublicRecord" },
            },
          },
        },
        ResearchIntakeCandidateNavigationItem: {
          type: "object",
          description: "One adjacent candidate in the immutable pinned source order.",
          required: ["id", "title", "position", "href"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            position: {
              type: "integer",
              minimum: 1,
              maximum: OPENAPI_RESEARCH_CATALOG_COUNT,
            },
            href: { type: "string" },
          },
        },
        ResearchIntakeCandidateNavigation: {
          type: "object",
          description:
            "Canonical candidate-detail navigation in pinned source order. It is never sorted or ranked by performance.",
          required: [
            "order",
            "currentPosition",
            "totalCandidates",
            "catalogHref",
            "selfHref",
            "previous",
            "next",
          ],
          properties: {
            order: { type: "string", enum: ["pinned-source-order"] },
            currentPosition: {
              type: "integer",
              minimum: 1,
              maximum: OPENAPI_RESEARCH_CATALOG_COUNT,
            },
            totalCandidates: {
              type: "integer",
              enum: [OPENAPI_RESEARCH_CATALOG_COUNT],
            },
            catalogHref: { type: "string", example: "/api/research/intake" },
            selfHref: {
              type: "string",
              example:
                "/api/research/intake/a-risk-based-approach-to-tactical-asset-allocation",
            },
            previous: {
              allOf: [{ $ref: "#/components/schemas/ResearchIntakeCandidateNavigationItem" }],
              nullable: true,
            },
            next: {
              allOf: [{ $ref: "#/components/schemas/ResearchIntakeCandidateNavigationItem" }],
              nullable: true,
            },
          },
        },
        ResearchIntakeCandidateResponse: {
          type: "object",
          description:
            "Public, deterministic projection of one exact pinned candidate. Admin timing, next-action, receipt, and marketing workflow fields are excluded.",
          required: [
            "schemaVersion",
            "access",
            "resources",
            "startHere",
            "source",
            "selectionPolicy",
            "workflow",
            "claimBoundary",
            "catalogSummary",
            "catalogEvidenceStateSummary",
            "navigation",
            "record",
          ],
          properties: {
            schemaVersion: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/schemaVersion",
            },
            access: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/access" },
            resources: {
              $ref: "#/components/schemas/ResearchIntakePublicResources",
            },
            startHere: {
              $ref: "#/components/schemas/ResearchIntakeStartHere",
            },
            source: { $ref: "#/components/schemas/ResearchIntakeResponse/properties/source" },
            selectionPolicy: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/selectionPolicy",
            },
            workflow: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/workflow",
            },
            claimBoundary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/claimBoundary",
            },
            catalogSummary: {
              $ref: "#/components/schemas/ResearchIntakeResponse/properties/catalogSummary",
            },
            catalogEvidenceStateSummary: {
              $ref: "#/components/schemas/ResearchIntakeEvidenceStateSummary",
              description:
                `Whole ${OPENAPI_RESEARCH_CATALOG_COUNT}-candidate interpretation included with the exact candidate context.`,
            },
            navigation: {
              $ref: "#/components/schemas/ResearchIntakeCandidateNavigation",
            },
            record: { $ref: "#/components/schemas/ResearchIntakePublicRecord" },
          },
        },
        HealthResponse: {
          type: "object",
          required: ["status", "version", "uptime", "timestamp", "checks"],
          properties: {
            status: { type: "string", enum: ["ok", "unhealthy"], example: "ok" },
            version: { type: "string" },
            uptime: { type: "number" },
            timestamp: { type: "string", format: "date-time" },
            node: { type: "string" },
            build: { type: "string" },
            checks: {
              type: "object",
              required: ["database", "migrations"],
              properties: {
                database: {
                  type: "object",
                  required: ["status"],
                  properties: {
                    status: { type: "string", enum: ["ok", "error", "unknown"] },
                  },
                },
                migrations: {
                  type: "object",
                  required: ["status", "required"],
                  properties: {
                    status: { type: "string", enum: ["ok", "error", "unknown"] },
                    required: { type: "string", example: "054_d1_alpha_ledger.sql" },
                  },
                },
              },
            },
          },
        },
      },
    },
    // Most endpoints are public. Security is applied explicitly only on the
    // ones that require a key, so no top-level `security` array here.
    paths: {
      "/api/research/intake/brief.md": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeEvidenceBrief",
          summary: "Read the human-readable systematic-research evidence brief",
          description:
            `Returns a human-readable orientation for all ${OPENAPI_RESEARCH_CATALOG_COUNT} pinned candidates: ${OPENAPI_RESEARCH_CATALOG_EVIDENCE_SUMMARY.performanceGatesEvaluated} reached TradeClaw performance gates, ${OPENAPI_RESEARCH_CATALOG_SUMMARY.failed} modeled historical candidates failed, and ${OPENAPI_RESEARCH_CATALOG_EVIDENCE_SUMMARY.performanceGatesNotEvaluated} were not evaluated. ` +
            "It includes the pinned source, gross-discovery boundary, preregistration workflow, adverse-inclusive counts, and canonical open-data links. No API key is required, and the brief grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          responses: {
            "200": {
              description: "Public human-readable research evidence orientation",
              content: {
                "text/markdown": {
                  schema: {
                    type: "string",
                    description:
                      "Deterministic UTF-8 Markdown derived from the record-free public research overview.",
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/overview": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeOverview",
          summary: "Orient from the compact systematic-research evidence state",
          description:
            `Returns record-free summaries for all ${OPENAPI_RESEARCH_CATALOG_COUNT} pinned candidates and the complete ${OPENAPI_RESEARCH_EVIDENCE_COUNT}-record TradeClaw evidence subset, plus claim boundaries and one safe next resource. ` +
            "No API key is required. The response is filter-free, includes no candidate bodies, and grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          responses: {
            "200": {
              description: "Compact public research evidence orientation",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResearchIntakeOverviewResponse" },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/evidence/index": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeEvidenceIndex",
          summary: "Browse the lightweight systematic-research evidence index",
          description:
            `Returns compact identity, evidence-state labels, and exact detail links for all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} examined candidates in pinned source order. ` +
            "No API key is required. The list is filter-free and never performance-ranked; complete source audits and replication bodies stay on the linked candidate and evidence resources.",
          security: [],
          responses: {
            "200": {
              description: "Compact adverse-inclusive public research evidence index",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/ResearchIntakeEvidenceIndexResponse",
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/evidence/index.md": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeEvidenceIndexBrief",
          summary: "Read the human-readable examined-candidate index",
          description:
            `Returns a human-readable adverse-inclusive index for all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} examined candidates in pinned source order. ` +
            "The list is not performance-ranked and preserves source-audit-only, QA-only, and modeled historical distinctions with exact public detail links. No API key is required, and the index grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          responses: {
            "200": {
              description: "Public human-readable examined-candidate index",
              content: {
                "text/markdown": {
                  schema: {
                    type: "string",
                    description:
                      "Deterministic UTF-8 Markdown derived from the compact public research evidence index.",
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/intake": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntake",
          summary: "Inspect the pinned systematic-research intake",
          description:
            `Returns all ${OPENAPI_RESEARCH_CATALOG_COUNT} source candidates in original order with upstream figures labeled as gross discovery metadata only and completed TradeClaw overlays labeled as modeled historical research. ` +
            "No API key is required. The response excludes admin and marketing workflow and grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          responses: {
            "200": {
              description: "Pinned public research intake and completed evidence overlays",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResearchIntakeResponse" },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/evidence": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeEvidence",
          summary: "Inspect every examined systematic-research candidate",
          description:
            `Returns all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} candidates with a TradeClaw source-audit or replication overlay in pinned source order, including all failures, no-go audits, and the inconclusive run. ` +
            "The complete set is filter-free and never performance-ranked. No API key is required, and the response grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          responses: {
            "200": {
              description: "Complete adverse-inclusive public research evidence index",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResearchIntakeEvidenceResponse" },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/evidence.csv": {
        get: {
          tags: ["Research"],
          operationId: "downloadResearchIntakeEvidenceCsv",
          summary: "Download every examined research candidate as CSV",
          description:
            `Returns all ${OPENAPI_RESEARCH_EVIDENCE_COUNT} examined candidates as a claim-safe 25-column spreadsheet in pinned source order, including all failures, no-go audits, and the inconclusive run. ` +
            "No API key is required. Every row repeats the pinned source receipt and false publication/trading authority; the canonical evidence JSON retains complete nested research records.",
          security: [],
          responses: {
            "200": {
              description: "Complete adverse-inclusive public research evidence spreadsheet",
              headers: {
                "Content-Disposition": {
                  description: "Deterministic snapshot-dated evidence attachment filename",
                  schema: {
                    type: "string",
                    example:
                      'attachment; filename="tradeclaw-systematic-research-evidence-2026-08-29.csv"',
                  },
                },
              },
              content: {
                "text/csv": {
                  schema: {
                    type: "string",
                    description:
                      `The shared 25-column header plus ${OPENAPI_RESEARCH_EVIDENCE_COUNT} source-ordered evidence rows. Canonical evidence JSON remains authoritative for nested records.`,
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/{candidateId}": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeCandidate",
          summary: "Inspect one systematic-research candidate",
          description:
            "Returns one canonical candidate and its complete safe evidence overlay using exact, case-sensitive ID matching. " +
            "No API key is required. The response carries pinned-order catalog, self, previous, and next navigation plus the source receipt and claim boundaries, excludes admin, receipt, and marketing workflow, and grants no publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          parameters: [
            {
              name: "candidateId",
              in: "path",
              required: true,
              description:
                "Exact canonical candidate ID from the full intake response; aliases, task IDs, titles, case changes, and surrounding whitespace are not accepted.",
              schema: {
                type: "string",
                example: "a-risk-based-approach-to-tactical-asset-allocation",
              },
            },
          ],
          responses: {
            "200": {
              description: "One pinned public research candidate and its evidence overlay",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ResearchIntakeCandidateResponse" },
                },
              },
            },
            "404": {
              description: "No candidate has that exact canonical ID",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                  example: { error: "Research intake candidate not found." },
                },
              },
            },
          },
        },
      },
      "/api/research/intake/{candidateId}/brief.md": {
        get: {
          tags: ["Research"],
          operationId: "getResearchIntakeCandidateBrief",
          summary: "Read one systematic-research candidate as Markdown",
          description:
            "Returns one human-readable canonical candidate and its safe evidence interpretation using exact, case-sensitive ID matching. " +
            "No API key is required. The Markdown retains pinned source order, upstream gross-discovery boundaries, existing decision context, repository evidence paths, and previous/next human navigation without exposing admin workflow or granting publication, strategy-selection, broadcast, or trading authority.",
          security: [],
          parameters: [
            {
              name: "candidateId",
              in: "path",
              required: true,
              description:
                "Exact canonical candidate ID from a public record link; aliases, task IDs, titles, case changes, and surrounding whitespace are not accepted.",
              schema: {
                type: "string",
                example: "a-risk-based-approach-to-tactical-asset-allocation",
              },
            },
          ],
          responses: {
            "200": {
              description: "One pinned public research candidate as deterministic Markdown",
              content: {
                "text/markdown": {
                  schema: {
                    type: "string",
                    description:
                      "Deterministic UTF-8 Markdown derived from the exact safe public candidate projection.",
                  },
                },
              },
            },
            "404": {
              description: "No candidate has that exact canonical ID",
              content: {
                "text/markdown": {
                  schema: {
                    type: "string",
                    example:
                      "# Research intake candidate not found\n\nResearch intake candidate not found. Use an exact canonical candidate ID.\n",
                  },
                },
              },
            },
          },
        },
      },
      "/api/research/intake.csv": {
        get: {
          tags: ["Research"],
          operationId: "downloadResearchIntakeCsv",
          summary: "Download the systematic-research intake as CSV",
          description:
            `Returns all ${OPENAPI_RESEARCH_CATALOG_COUNT} source candidates in original order as a claim-safe 25-column spreadsheet index with the pinned source receipt and false publication/trading authority repeated on every row. ` +
            "The canonical JSON response retains complete nested TradeClaw evidence. No API key is required.",
          security: [],
          responses: {
            "200": {
              description: "Spreadsheet-ready public research intake index",
              headers: {
                "Content-Disposition": {
                  description: "Deterministic snapshot-dated attachment filename",
                  schema: {
                    type: "string",
                    example:
                      'attachment; filename="tradeclaw-systematic-research-intake-2026-08-29.csv"',
                  },
                },
              },
              content: {
                "text/csv": {
                  schema: {
                    type: "string",
                    description:
                      `Header plus ${OPENAPI_RESEARCH_CATALOG_COUNT} source-ordered rows. Canonical JSON remains authoritative for nested evidence objects.`,
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/signals": {
        get: {
          tags: ["Signals"],
          operationId: "listSignalsV1",
          summary: "List recent signals",
          description:
            "Returns recent rule-generated research candidates, optionally filtered by symbol, direction, and timeframe. " +
            "The legacy `confidence` field is a mechanical rule/confluence score from 0 to 100, not a predictive probability or evidence of edge. " +
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
          summary: "OHLCV-resolved signal-outcome study",
          description:
            "Returns descriptive statistics for non-simulated signal records whose outcomes have approved observed-OHLCV provenance. " +
            "Directional price moves are unsized research observations, not broker fills, customer trades, account returns, or portfolio P&L. The confidence field is a mechanical rule score, not a probability.",
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
              description: "The process, PostgreSQL connection, and required schema migration are ready",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/HealthResponse" },
                },
              },
            },
            "503": {
              description: "PostgreSQL or the required schema migration is unavailable",
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
