const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleDirectories: ["node_modules", "apps/web/node_modules"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^server-only$": "<rootDir>/jest.stubs/server-only.js",
  },
  globals: {
    "ts-jest": {
      tsconfig: "apps/web/tsconfig.json",
    },
  },
};