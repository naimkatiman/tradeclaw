const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/.next/",
    "/apps/web/tests/e2e/",
    "/apps/ws-server/",
    "/apps/web/lib/__tests__/signal-history-cache.test.ts",
  ],
  modulePathIgnorePatterns: [
    "/.next/standalone/",
    "/.claude/worktrees/",
  ],
  transform: {
    ...tsJestTransformCfg,
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@tradeclaw/)",
    "\\.pnp\\.[^\\/]+$",
  ],
  moduleDirectories: ["node_modules", "apps/web/node_modules"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^server-only$": "<rootDir>/jest.stubs/server-only.js",
    "^@/(.*)$": "<rootDir>/apps/web/$1",
    "^@tradeclaw/signals$": "<rootDir>/packages/signals/src/index.ts",
    "^@tradeclaw/core$": "<rootDir>/packages/core/src/index.ts",
    "^@tradeclaw/trading-agents$": "<rootDir>/packages/trading-agents/src/index.ts",
    "^@tradeclaw/strategies$": "<rootDir>/packages/strategies/src/index.ts",
  },
  globals: {
    "ts-jest": {
      tsconfig: "apps/web/tsconfig.json",
    },
  },
};