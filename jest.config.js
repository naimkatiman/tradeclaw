const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
<<<<<<< HEAD
=======
  moduleDirectories: ["node_modules", "apps/web/node_modules"],
  globals: {
    "ts-jest": {
      tsconfig: "apps/web/tsconfig.json",
    },
  },
>>>>>>> origin/main
};