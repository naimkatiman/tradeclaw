type BuildIdentityKey =
  | "BUILD_ID"
  | "NEXT_PUBLIC_BUILD_TIME"
  | "RAILWAY_GIT_COMMIT_SHA"
  | "RAILWAY_SNAPSHOT_ID"
  | "RAILWAY_DEPLOYMENT_ID"
  | "NODE_ENV";

type BuildEnvironment = Partial<Pick<NodeJS.ProcessEnv, BuildIdentityKey>>;

const BUILD_ID_KEYS = [
  "BUILD_ID",
  "NEXT_PUBLIC_BUILD_TIME",
  "RAILWAY_GIT_COMMIT_SHA",
  "RAILWAY_SNAPSHOT_ID",
  "RAILWAY_DEPLOYMENT_ID",
] as const;

export function getBuildIdentity(env: BuildEnvironment = process.env): string {
  for (const key of BUILD_ID_KEYS) {
    const value = env[key]?.trim();
    if (value) return value;
  }

  return env.NODE_ENV === "production" ? "unknown" : "development";
}
