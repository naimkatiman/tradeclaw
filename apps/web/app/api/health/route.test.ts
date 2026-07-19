import fs from "node:fs";
import path from "node:path";

jest.mock("../../../lib/db-pool", () => ({
  queryOne: jest.fn(),
}));

import { queryOne } from "../../../lib/db-pool";
import { GET, REQUIRED_MIGRATION } from "./route";

const mockedQueryOne = queryOne as jest.MockedFunction<typeof queryOne>;
const originalDatabaseUrl = process.env.DATABASE_URL;

beforeEach(() => {
  mockedQueryOne.mockReset();
  process.env.DATABASE_URL = "postgresql://tradeclaw:test@localhost:5432/tradeclaw";
});

afterAll(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL;
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl;
  }
});

describe("GET /api/health", () => {
  it("returns ready only when PostgreSQL and the required migration are present", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ ok: 1 })
      .mockResolvedValueOnce({ filename: REQUIRED_MIGRATION });

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      checks: {
        database: { status: "ok" },
        migrations: { status: "ok", required: REQUIRED_MIGRATION },
      },
    });
    expect(mockedQueryOne).toHaveBeenNthCalledWith(1, "SELECT 1 AS ok");
    expect(mockedQueryOne).toHaveBeenNthCalledWith(
      2,
      "SELECT filename FROM _migrations WHERE filename = $1",
      [REQUIRED_MIGRATION],
    );
  });

  it("returns a sanitized 503 without querying when DATABASE_URL is absent", async () => {
    delete process.env.DATABASE_URL;

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(503);
    expect(body).toMatchObject({
      status: "unhealthy",
      checks: {
        database: { status: "error" },
        migrations: { status: "unknown", required: REQUIRED_MIGRATION },
      },
    });
    expect(JSON.stringify(body)).not.toContain("DATABASE_URL");
    expect(mockedQueryOne).not.toHaveBeenCalled();
  });

  it("returns a sanitized 503 when the database probe fails", async () => {
    mockedQueryOne.mockRejectedValueOnce(new Error("password=do-not-leak"));

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(503);
    expect(body.checks.database.status).toBe("error");
    expect(body.checks.migrations.status).toBe("unknown");
    expect(JSON.stringify(body)).not.toContain("do-not-leak");
  });

  it("returns 503 when the migration table or required migration is unavailable", async () => {
    mockedQueryOne
      .mockResolvedValueOnce({ ok: 1 })
      .mockRejectedValueOnce(new Error('relation "_migrations" does not exist'));

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(503);
    expect(body.checks.database.status).toBe("ok");
    expect(body.checks.migrations).toEqual({
      status: "error",
      required: REQUIRED_MIGRATION,
    });
    expect(JSON.stringify(body)).not.toContain("_migrations");
  });

  it("returns 503 when the required migration has not been recorded", async () => {
    mockedQueryOne.mockResolvedValueOnce({ ok: 1 }).mockResolvedValueOnce(null);

    const result = await GET();
    const body = await result.json();

    expect(result.status).toBe(503);
    expect(body.checks.migrations.status).toBe("error");
  });

  it("keeps the readiness guard aligned with the latest numbered core migration", () => {
    const migrationDirectory = path.join(process.cwd(), "apps", "web", "migrations");
    const latestMigration = fs
      .readdirSync(migrationDirectory)
      .filter((filename) => /^\d{3}_.+\.sql$/.test(filename))
      .sort((left, right) => Number(left.slice(0, 3)) - Number(right.slice(0, 3)))
      .at(-1);

    expect(REQUIRED_MIGRATION).toBe(latestMigration);
  });
});
