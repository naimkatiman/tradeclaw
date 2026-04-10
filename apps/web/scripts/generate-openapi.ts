/**
 * Generate a static snapshot of the OpenAPI spec into public/openapi.json.
 *
 * Run manually via:
 *   npx tsx apps/web/scripts/generate-openapi.ts
 *
 * The snapshot is also served dynamically by GET /api/openapi.json, so this
 * file is optional — it exists so the spec is directly fetchable as a static
 * asset (CDN-friendly) and so spec changes are visible in PR diffs.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildOpenApiSpec } from "../lib/openapi";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outPath = resolve(__dirname, "..", "public", "openapi.json");

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(buildOpenApiSpec(), null, 2) + "\n", "utf8");

// eslint-disable-next-line no-console
console.log(`[openapi] wrote ${outPath}`);
