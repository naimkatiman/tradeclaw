// @tradeclaw/core — feature flag registry (scaffold)
//
// Self-contained, dependency-free feature-flag definitions and a pure resolver.
//
// STATUS: UNWIRED SCAFFOLD. This module is intentionally NOT exported from
// `packages/core/src/index.ts` and is NOT referenced by any runtime code yet.
// It exists to support the rollout plan in
// `docs/adr/0001-extract-signal-engine-into-scheduled-worker.md`: gate the
// signal-worker extraction behind a flag and gate the alert->click->signup->
// subscription->retained funnel instrumentation behind a flag, so each can be
// switched on per-environment without a code change.
//
// Design notes:
//  - No external dependencies and no global (`process`) reference. The resolver
//    takes an env map as an argument, so callers pass `process.env` (or any
//    record) at the boundary. This keeps the module pure and trivially testable.
//  - Adding a flag = add one entry to `FEATURE_FLAGS`. The key union is derived
//    from that object, so the type system stays in sync automatically.

/** A single feature-flag definition. */
export interface FeatureFlagDefinition {
  /** Stable identifier used in code and logs. */
  readonly key: string;
  /** Human-readable purpose of the flag. */
  readonly description: string;
  /** Environment variable that overrides the default at runtime. */
  readonly envVar: string;
  /** Value used when the env var is unset or unparseable. */
  readonly defaultValue: boolean;
}

/**
 * The flag registry. Defaults are OFF so the scaffold never changes behaviour
 * until an operator opts in via the documented environment variable.
 */
export const FEATURE_FLAGS = {
  /** Route signal generation through the dedicated scheduled worker instead of
   *  the in-app GitHub Actions cron -> Next.js API route path. */
  signalWorkerEnabled: {
    key: 'signalWorkerEnabled',
    description:
      'Run signal generation in the extracted scheduled worker instead of the in-app cron route.',
    envVar: 'TRADECLAW_FF_SIGNAL_WORKER',
    defaultValue: false,
  },
  /** Run the legacy in-app cron path and the extracted worker side by side and
   *  compare outputs, without acting on the worker result. Migration safety. */
  signalWorkerShadowMode: {
    key: 'signalWorkerShadowMode',
    description:
      'Run the extracted worker in shadow mode alongside the legacy path to compare outputs before cutover.',
    envVar: 'TRADECLAW_FF_SIGNAL_WORKER_SHADOW',
    defaultValue: false,
  },
  /** Emit the alert->click->signup->subscription->retained funnel events. */
  funnelInstrumentation: {
    key: 'funnelInstrumentation',
    description:
      'Emit alert->click->signup->subscription->retained funnel analytics events.',
    envVar: 'TRADECLAW_FF_FUNNEL_INSTRUMENTATION',
    defaultValue: false,
  },
} as const satisfies Record<string, FeatureFlagDefinition>;

/** Canonical flag keys. Derived from the registry so they stay in sync. */
export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/** A minimal env source. `process.env` satisfies this shape. */
export type EnvSource = Readonly<Record<string, unknown>>;

/**
 * Parse an environment string into a boolean.
 * Truthy: "1", "true", "yes", "on" (case-insensitive). Everything else is false.
 * `undefined`, `null`, non-string, or empty values return `undefined` so the caller can fall back to the default.
 */
export function parseBooleanEnv(raw: unknown): boolean | undefined {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw !== 'string') return undefined;
  const normalized = raw.trim().toLowerCase();
  if (normalized === '') return undefined;
  return (
    normalized === '1' ||
    normalized === 'true' ||
    normalized === 'yes' ||
    normalized === 'on'
  );
}

/**
 * Resolve a single flag against an env source, falling back to its default.
 * Pure: no global state, no I/O.
 */
export function resolveFlag(flag: FeatureFlagKey, env?: EnvSource | null): boolean {
  const def = FEATURE_FLAGS[flag];
  const fromEnv = parseBooleanEnv(env?.[def.envVar]);
  return fromEnv === undefined ? def.defaultValue : fromEnv;
}

/** Resolve every flag against an env source. */
export function resolveAllFlags(env?: EnvSource | null): Record<FeatureFlagKey, boolean> {
  const out = {} as Record<FeatureFlagKey, boolean>;
  for (const key of Object.keys(FEATURE_FLAGS) as FeatureFlagKey[]) {
    out[key] = resolveFlag(key, env);
  }
  return out;
}
