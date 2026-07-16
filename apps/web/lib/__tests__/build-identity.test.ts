import { getBuildIdentity } from "../build-identity";

describe("getBuildIdentity", () => {
  test("prefers an explicit build ID", () => {
    expect(
      getBuildIdentity({
        BUILD_ID: "release-42",
        RAILWAY_GIT_COMMIT_SHA: "git-sha",
        RAILWAY_SNAPSHOT_ID: "snapshot-id",
        RAILWAY_DEPLOYMENT_ID: "deployment-id",
        NODE_ENV: "production",
      })
    ).toBe("release-42");
  });

  test("keeps the existing public build-time override", () => {
    expect(
      getBuildIdentity({
        NEXT_PUBLIC_BUILD_TIME: "2026-07-16T15:00:00Z",
        RAILWAY_GIT_COMMIT_SHA: "git-sha",
        NODE_ENV: "production",
      })
    ).toBe("2026-07-16T15:00:00Z");
  });

  test("uses the Git commit for GitHub-triggered Railway deploys", () => {
    expect(
      getBuildIdentity({
        RAILWAY_GIT_COMMIT_SHA: "git-sha",
        RAILWAY_SNAPSHOT_ID: "snapshot-id",
        RAILWAY_DEPLOYMENT_ID: "deployment-id",
        NODE_ENV: "production",
      })
    ).toBe("git-sha");
  });

  test("uses Railway snapshot then deployment identity for CLI deploys", () => {
    expect(
      getBuildIdentity({
        RAILWAY_SNAPSHOT_ID: "snapshot-id",
        RAILWAY_DEPLOYMENT_ID: "deployment-id",
        NODE_ENV: "production",
      })
    ).toBe("snapshot-id");

    expect(
      getBuildIdentity({
        RAILWAY_DEPLOYMENT_ID: "deployment-id",
        NODE_ENV: "production",
      })
    ).toBe("deployment-id");
  });

  test("never labels an unidentified production build as development", () => {
    expect(getBuildIdentity({ NODE_ENV: "production" })).toBe("unknown");
    expect(getBuildIdentity({ NODE_ENV: "development" })).toBe("development");
  });

  test("ignores blank identity values", () => {
    expect(
      getBuildIdentity({
        BUILD_ID: " ",
        RAILWAY_GIT_COMMIT_SHA: "",
        RAILWAY_DEPLOYMENT_ID: "deployment-id",
        NODE_ENV: "production",
      })
    ).toBe("deployment-id");
  });
});
