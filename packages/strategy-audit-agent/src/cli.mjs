#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import process from "node:process";
import { loadAuditRequest } from "./config.mjs";
import { buildAuditMatrix } from "./matrix.mjs";
import { createIsolatedBrowser, runDeterministicBacktest } from "./browser.mjs";
import { runComputerBacktest } from "./computer-use.mjs";
import { buildMarkdownReport, createAiReview } from "./report.mjs";

function usage() {
  return `
TradeClaw strategy audit agent

Usage:
  node src/cli.mjs --request ./examples/audit-request.json [options]

Options:
  --out <dir>       Output directory (default: ./audit-output/<timestamp>)
  --fixture <file>  Generate and validate a report from fixture result JSON
  --dry-run         Validate request and print the run matrix only
  --ai-summary      Add a skeptical OpenAI-generated executive review
  --headful         Show the Playwright browser
  --help            Show this message
`.trim();
}

function parseArgs(argv) {
  const args = { dryRun: false, aiSummary: false, headful: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") args.help = true;
    else if (token === "--dry-run") args.dryRun = true;
    else if (token === "--ai-summary") args.aiSummary = true;
    else if (token === "--headful") args.headful = true;
    else if (["--request", "--out", "--fixture"].includes(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${token} requires a value`);
      args[token.slice(2)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }
  return args;
}

function defaultOutputDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.resolve("audit-output", stamp);
}

async function loadFixture(filePath, matrix) {
  const parsed = JSON.parse(await readFile(filePath, "utf8"));
  if (!Array.isArray(parsed)) throw new Error("Fixture results must be a JSON array");
  const expectedIds = new Set(matrix.map((run) => run.id));
  const actualIds = new Set(parsed.map((run) => run.id));
  const unknown = [...actualIds].filter((id) => !expectedIds.has(id));
  const missing = [...expectedIds].filter((id) => !actualIds.has(id));
  if (unknown.length || missing.length) {
    throw new Error(
      `Fixture does not match the request matrix. Unknown: ${unknown.join(", ") || "none"}; ` +
        `missing: ${missing.join(", ") || "none"}`,
    );
  }
  return parsed;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function persistProgress(outDir, request, results) {
  await writeFile(
    path.join(outDir, "results.json"),
    `${JSON.stringify({ request, generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
    "utf8",
  );
}

async function runLiveAudit({ request, matrix, outDir, headful }) {
  const results = [];
  const artifactDir = path.join(outDir, "artifacts");
  const { browser, page } = await createIsolatedBrowser({ headless: !headful });

  try {
    for (const [index, run] of matrix.entries()) {
      process.stdout.write(`[${index + 1}/${matrix.length}] ${run.id} ... `);
      try {
        let result;
        if (request.mode === "computer") {
          result = await runComputerBacktest({ page, request, run, artifactDir });
        } else {
          try {
            result = await runDeterministicBacktest({ page, request, run, artifactDir });
          } catch (deterministicError) {
            const shouldFallback = request.mode === "hybrid"
              && request.allowComputerFallback
              && Boolean(process.env.OPENAI_API_KEY);
            if (!shouldFallback) throw deterministicError;
            process.stdout.write(`deterministic failed (${deterministicError.message}); computer fallback ... `);
            result = await runComputerBacktest({ page, request, run, artifactDir });
            result.deterministicError = deterministicError.message;
          }
        }
        results.push(result);
        process.stdout.write("done\n");
      } catch (error) {
        results.push({
          ...run,
          status: "failed",
          mode: request.mode,
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date().toISOString(),
        });
        process.stdout.write(`failed: ${results.at(-1).error}\n`);
      }
      await persistProgress(outDir, request, results);
    }
  } finally {
    await browser.close();
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.request) throw new Error("--request is required\n\n" + usage());

  const request = await loadAuditRequest(path.resolve(args.request));
  const matrix = buildAuditMatrix(request);
  if (args.dryRun) {
    console.log(JSON.stringify({ request, matrix }, null, 2));
    return;
  }

  const outDir = path.resolve(args.out ?? defaultOutputDir());
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "request.normalized.json"), `${JSON.stringify(request, null, 2)}\n`);

  const results = args.fixture
    ? await loadFixture(path.resolve(args.fixture), matrix)
    : await runLiveAudit({ request, matrix, outDir, headful: args.headful });

  const aiReview = args.aiSummary ? await createAiReview({ request, results }) : "";
  const generatedAt = new Date().toISOString();
  const requestHash = sha256(JSON.stringify(request));
  const resultsHash = sha256(JSON.stringify(results));
  const report = buildMarkdownReport({
    request,
    results,
    generatedAt,
    requestHash,
    aiSummary: aiReview,
  });
  await writeFile(path.join(outDir, "report.md"), report, "utf8");
  await persistProgress(outDir, request, results);
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify({
      schemaVersion: 1,
      generatedAt,
      requestSha256: requestHash,
      resultsSha256: resultsHash,
      completedRuns: results.filter((run) => run.status === "completed").length,
      totalRuns: results.length,
    }, null, 2)}\n`,
    "utf8",
  );

  const successful = results.filter((run) => run.status === "completed").length;
  console.log(`Report: ${path.join(outDir, "report.md")}`);
  console.log(`Completed: ${successful}/${results.length}`);
  if (successful === 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
