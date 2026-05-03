// Admin dashboard — server-rendered HTML view over existing audit data.
// Read-only. Three panels: Today, Missed Queries, Experiments.
// Auth: ?key=<ADMIN_API_KEY> with constant-time compare.

import type { Env } from '../types';

interface TodayCounts {
  autoFaqRuns24h: number;
  gapDetectionRuns24h: number;
  patternAnalysisRuns24h: number;
  lessonsCreated24h: number;
  experimentsCompleted24h: number;
  experimentsApplied24h: number;
  newMissedQueries24h: number;
}

interface MissedQueryRow {
  id: number;
  normalized_query: string;
  sample_query: string;
  language: string | null;
  bot_personality: string | null;
  hit_count: number;
  first_seen: string;
  last_seen: string;
}

interface ExperimentRow {
  experiment_id: string;
  parameter_type: string;
  parameter_key: string;
  hypothesis: string | null;
  baseline_score: number | null;
  mutated_score: number | null;
  winner: string;
  applied: number;
  status: string;
  created_at: string;
  completed_at: string | null;
}

export async function handleAdminDashboard(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const providedKey = url.searchParams.get('key') ?? '';
  const expectedKey = env.ADMIN_API_KEY ?? '';

  if (!expectedKey || !constantTimeEquals(providedKey, expectedKey)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const [today, missed, experiments] = await Promise.all([
    fetchTodayCounts(env),
    fetchMissedQueries(env, 20),
    fetchExperiments(env, 20),
  ]);

  const html = renderDashboard({ today, missed, experiments, keyParam: providedKey });

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

async function fetchTodayCounts(env: Env): Promise<TodayCounts> {
  const cutoff = `datetime('now', '-24 hours')`;

  const [autoFaq, gapDet, patternAn, lessons, expCompleted, expApplied, newMissed] =
    await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM auto_learning_runs
         WHERE run_type = 'auto_faq' AND started_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM auto_learning_runs
         WHERE run_type = 'gap_detection' AND started_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM learning_runs
         WHERE run_type = 'pattern_analysis' AND started_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COALESCE(SUM(lessons_created), 0) AS n FROM learning_runs
         WHERE started_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM experiments
         WHERE status = 'completed' AND completed_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM experiments
         WHERE applied = 1 AND applied_at > ${cutoff}`
      ).first<{ n: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM missed_queries
         WHERE first_seen > ${cutoff}`
      ).first<{ n: number }>(),
    ]);

  return {
    autoFaqRuns24h: autoFaq?.n ?? 0,
    gapDetectionRuns24h: gapDet?.n ?? 0,
    patternAnalysisRuns24h: patternAn?.n ?? 0,
    lessonsCreated24h: lessons?.n ?? 0,
    experimentsCompleted24h: expCompleted?.n ?? 0,
    experimentsApplied24h: expApplied?.n ?? 0,
    newMissedQueries24h: newMissed?.n ?? 0,
  };
}

async function fetchMissedQueries(env: Env, limit: number): Promise<MissedQueryRow[]> {
  const result = await env.DB.prepare(
    `SELECT id, normalized_query, sample_query, language, bot_personality,
            hit_count, first_seen, last_seen
     FROM missed_queries
     WHERE resolved = 0
     ORDER BY hit_count DESC, last_seen DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<MissedQueryRow>();
  return result.results ?? [];
}

async function fetchExperiments(env: Env, limit: number): Promise<ExperimentRow[]> {
  const result = await env.DB.prepare(
    `SELECT experiment_id, parameter_type, parameter_key, hypothesis,
            baseline_score, mutated_score, winner, applied, status,
            created_at, completed_at
     FROM experiments
     ORDER BY created_at DESC
     LIMIT ?`
  )
    .bind(limit)
    .all<ExperimentRow>();
  return result.results ?? [];
}

interface RenderInput {
  today: TodayCounts;
  missed: MissedQueryRow[];
  experiments: ExperimentRow[];
  keyParam: string;
}

function renderDashboard({ today, missed, experiments, keyParam }: RenderInput): string {
  const generatedAt = new Date().toISOString();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Roboforex — Learning Dashboard</title>
<style>
  :root {
    color-scheme: dark;
    --bg: #0b0d10;
    --panel: #14181d;
    --border: #2a313a;
    --text: #e8eaed;
    --muted: #8a93a0;
    --accent: #7dd3fc;
    --good: #4ade80;
    --bad: #f87171;
    --warn: #fbbf24;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
  }
  .wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 80px; }
  h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: -0.01em; }
  .meta { color: var(--muted); font-size: 12px; margin-bottom: 24px; }
  .panel {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 18px 20px;
    margin-bottom: 18px;
  }
  .panel h2 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 0 0 14px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 12px;
  }
  .stat { padding: 10px 0; }
  .stat .num { font-size: 22px; font-weight: 600; }
  .stat .label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  th, td {
    text-align: left;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  th { color: var(--muted); font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  td .sub { color: var(--muted); font-size: 11px; margin-top: 2px; }
  .pill {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 999px;
    font-size: 11px;
    background: #1f262e;
    color: var(--muted);
  }
  .pill.good { background: rgba(74, 222, 128, 0.15); color: var(--good); }
  .pill.bad { background: rgba(248, 113, 113, 0.15); color: var(--bad); }
  .pill.warn { background: rgba(251, 191, 36, 0.15); color: var(--warn); }
  .empty { color: var(--muted); font-style: italic; padding: 8px 0; }
  code {
    font: 12px ui-monospace, SFMono-Regular, Menlo, monospace;
    background: #0d1117;
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
  }
  .hint {
    font-size: 12px;
    color: var(--muted);
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--border);
  }
</style>
</head>
<body>
<div class="wrap">
  <h1>Roboforex — Learning Dashboard</h1>
  <div class="meta">Generated ${escapeHtml(generatedAt)} UTC · read-only · refresh to update</div>

  <section class="panel">
    <h2>Today (last 24h)</h2>
    <div class="grid">
      <div class="stat"><div class="num">${today.autoFaqRuns24h}</div><div class="label">Auto-FAQ runs</div></div>
      <div class="stat"><div class="num">${today.gapDetectionRuns24h}</div><div class="label">Gap-detection runs</div></div>
      <div class="stat"><div class="num">${today.patternAnalysisRuns24h}</div><div class="label">Pattern-analysis runs</div></div>
      <div class="stat"><div class="num">${today.lessonsCreated24h}</div><div class="label">Lessons created</div></div>
      <div class="stat"><div class="num">${today.experimentsCompleted24h}</div><div class="label">Experiments completed</div></div>
      <div class="stat"><div class="num">${today.experimentsApplied24h}</div><div class="label">Experiments applied</div></div>
      <div class="stat"><div class="num">${today.newMissedQueries24h}</div><div class="label">New missed queries</div></div>
    </div>
  </section>

  <section class="panel">
    <h2>Missed queries — top 20 unresolved</h2>
    ${renderMissedTable(missed, keyParam)}
    <div class="hint">To convert a row into an auto-FAQ, POST <code>/admin/auto-faq</code> with bearer auth.</div>
  </section>

  <section class="panel">
    <h2>Experiments — last 20</h2>
    ${renderExperimentsTable(experiments)}
    <div class="hint">To roll back the last applied experiment, POST <code>/admin/evolver/rollback</code> with bearer auth.</div>
  </section>
</div>
</body>
</html>`;
}

function renderMissedTable(rows: MissedQueryRow[], _keyParam: string): string {
  if (rows.length === 0) {
    return `<div class="empty">No unresolved missed queries.</div>`;
  }
  const body = rows
    .map((r) => {
      const langPill = r.language
        ? `<span class="pill">${escapeHtml(r.language)}</span>`
        : '';
      const persPill = r.bot_personality
        ? `<span class="pill">${escapeHtml(r.bot_personality)}</span>`
        : '';
      return `<tr>
        <td class="num">${r.hit_count}</td>
        <td>
          <div>${escapeHtml(r.sample_query)}</div>
          <div class="sub">${escapeHtml(r.normalized_query)} ${langPill} ${persPill}</div>
        </td>
        <td class="num">${escapeHtml(formatRelativeTime(r.last_seen))}</td>
      </tr>`;
    })
    .join('\n');
  return `<table>
    <thead><tr><th class="num">Hits</th><th>Query</th><th class="num">Last seen</th></tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function renderExperimentsTable(rows: ExperimentRow[]): string {
  if (rows.length === 0) {
    return `<div class="empty">No experiments yet.</div>`;
  }
  const body = rows
    .map((r) => {
      const winnerPill = renderWinnerPill(r.winner, r.applied);
      const statusPill =
        r.status === 'failed'
          ? `<span class="pill bad">${escapeHtml(r.status)}</span>`
          : `<span class="pill">${escapeHtml(r.status)}</span>`;
      const baseline = r.baseline_score == null ? '—' : r.baseline_score.toFixed(3);
      const mutated = r.mutated_score == null ? '—' : r.mutated_score.toFixed(3);
      const delta =
        r.baseline_score != null && r.mutated_score != null
          ? formatDelta(r.mutated_score - r.baseline_score)
          : '—';
      return `<tr>
        <td>
          <div><code>${escapeHtml(r.experiment_id)}</code></div>
          <div class="sub">${escapeHtml(r.parameter_type)} / ${escapeHtml(r.parameter_key)}</div>
        </td>
        <td>${r.hypothesis ? escapeHtml(r.hypothesis) : '<span class="empty">no hypothesis</span>'}</td>
        <td class="num">${baseline} → ${mutated} <div class="sub">${delta}</div></td>
        <td>${winnerPill} ${statusPill}</td>
        <td class="num">${escapeHtml(formatRelativeTime(r.created_at))}</td>
      </tr>`;
    })
    .join('\n');
  return `<table>
    <thead><tr>
      <th>Experiment</th><th>Hypothesis</th><th class="num">Score</th><th>Outcome</th><th class="num">Created</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table>`;
}

function renderWinnerPill(winner: string, applied: number): string {
  if (winner === 'mutation') {
    const cls = applied ? 'good' : 'warn';
    const label = applied ? 'mutation · applied' : 'mutation · not applied';
    return `<span class="pill ${cls}">${escapeHtml(label)}</span>`;
  }
  if (winner === 'baseline') {
    return `<span class="pill">baseline held</span>`;
  }
  if (winner === 'tie') {
    return `<span class="pill">tie</span>`;
  }
  return `<span class="pill">pending</span>`;
}

function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}`;
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return '—';
  const t = Date.parse(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(t)) return iso;
  const diffSec = Math.round((Date.now() - t) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffSec < 3600) return `${Math.round(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.round(diffSec / 3600)}h ago`;
  return `${Math.round(diffSec / 86400)}d ago`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
