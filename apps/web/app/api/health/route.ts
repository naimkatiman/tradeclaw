import { NextResponse } from "next/server";
import pkg from "../../../package.json";
import { getBuildIdentity } from "../../../lib/build-identity";
import { queryOne } from "../../../lib/db-pool";

export const dynamic = "force-dynamic";

export const REQUIRED_MIGRATION = "053_drop_monetization.sql";

type CheckStatus = "ok" | "error" | "unknown";

interface HealthChecks {
  database: { status: CheckStatus };
  migrations: { status: CheckStatus; required: string };
}

function response(status: "ok" | "unhealthy", checks: HealthChecks) {
  return NextResponse.json(
    {
      status,
      version: pkg.version,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      node: process.version,
      build: getBuildIdentity(),
      checks,
    },
    { status: status === "ok" ? 200 : 503 },
  );
}

export async function GET() {
  const requiredMigration = {
    status: "unknown" as CheckStatus,
    required: REQUIRED_MIGRATION,
  };

  if (!process.env.DATABASE_URL) {
    return response("unhealthy", {
      database: { status: "error" },
      migrations: requiredMigration,
    });
  }

  try {
    const database = await queryOne<{ ok: number }>("SELECT 1 AS ok");
    if (database?.ok !== 1) {
      return response("unhealthy", {
        database: { status: "error" },
        migrations: requiredMigration,
      });
    }
  } catch {
    return response("unhealthy", {
      database: { status: "error" },
      migrations: requiredMigration,
    });
  }

  try {
    const migration = await queryOne<{ filename: string }>(
      "SELECT filename FROM _migrations WHERE filename = $1",
      [REQUIRED_MIGRATION],
    );

    if (migration?.filename !== REQUIRED_MIGRATION) {
      return response("unhealthy", {
        database: { status: "ok" },
        migrations: { status: "error", required: REQUIRED_MIGRATION },
      });
    }
  } catch {
    return response("unhealthy", {
      database: { status: "ok" },
      migrations: { status: "error", required: REQUIRED_MIGRATION },
    });
  }

  return response("ok", {
    database: { status: "ok" },
    migrations: { status: "ok", required: REQUIRED_MIGRATION },
  });
}
