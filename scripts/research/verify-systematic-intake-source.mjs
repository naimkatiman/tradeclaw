import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const MANIFEST_PATH = new URL('../../apps/web/data/systematic-research-intake.json', import.meta.url);
const ASSET_CLASSES = new Set([
  'Equities',
  'Bonds',
  'Commodities',
  'Currencies',
  'Cryptocurrencies',
  'Derivatives',
  'Multi-asset',
]);

function fail(message) {
  throw new Error(`Research intake source verification failed: ${message}`);
}

function parseRows(readme) {
  const start = readme.indexOf('<!-- STRATEGIES:START');
  const end = readme.indexOf('<!-- STRATEGIES:END');
  if (start < 0 || end <= start) fail('generated strategy markers are missing');

  let assetClass = null;
  const rows = [];
  const rowPattern =
    /^\| \[(.+?)\]\((https:\/\/paperswithbacktest\.com\/strategies\/([^)]+))\) \| `(-?[0-9.]+)` \| `(-?[0-9.]+)` \| `([0-9.]+)%` \| `([0-9]+)` \|$/;

  for (const line of readme.slice(start, end).split(/\r?\n/)) {
    const heading = line.match(/^## (.+?)\s*$/);
    if (heading && ASSET_CLASSES.has(heading[1])) {
      assetClass = heading[1];
      continue;
    }

    const match = line.match(rowPattern);
    if (!match) continue;
    if (!assetClass) fail(`candidate ${match[3]} has no asset-class heading`);
    rows.push({
      id: match[3],
      title: match[1],
      sourceUrl: match[2],
      assetClass,
      upstreamGrossSharpe: Number(match[4]),
      upstreamTStatistic: Number(match[5]),
      upstreamVolatilityPct: Number(match[6]),
      upstreamYearsTested: Number(match[7]),
    });
  }

  return rows;
}

async function loadReadme(rawUrl) {
  const localFlag = process.argv.indexOf('--readme');
  if (localFlag >= 0) {
    const path = process.argv[localFlag + 1];
    if (!path || path.startsWith('-')) fail('--readme requires a local file path');
    return readFile(path);
  }

  const response = await fetch(rawUrl, {
    headers: { 'user-agent': 'tradeclaw-research-intake-verifier/1' },
    redirect: 'follow',
  });
  if (!response.ok) fail(`source returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, 'utf8'));
const rawUrl = `https://raw.githubusercontent.com/paperswithbacktest/awesome-systematic-trading/${manifest.source.commit}/README.md`;
const readmeBytes = await loadReadme(rawUrl);
const readmeSha256 = createHash('sha256').update(readmeBytes).digest('hex');

if (readmeSha256 !== manifest.source.readmeSha256) {
  fail(`README SHA-256 ${readmeSha256} does not match ${manifest.source.readmeSha256}`);
}

const parsed = parseRows(readmeBytes.toString('utf8'));
if (JSON.stringify(parsed) !== JSON.stringify(manifest.candidates)) {
  const firstMismatch = parsed.findIndex(
    (row, index) => JSON.stringify(row) !== JSON.stringify(manifest.candidates[index]),
  );
  fail(`manifest differs from the pinned README at source position ${firstMismatch}`);
}

const counts = Object.fromEntries(
  [...ASSET_CLASSES].map((name) => [name, parsed.filter((row) => row.assetClass === name).length]),
);

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      root: ROOT,
      commit: manifest.source.commit,
      readmeSha256,
      candidates: parsed.length,
      counts,
      performanceBasis: manifest.source.reportedPerformanceBasis,
      tradeClawTreatment: manifest.source.tradeClawTreatment,
    },
    null,
    2,
  )}\n`,
);
