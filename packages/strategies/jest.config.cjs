const { createDefaultPreset } = require('ts-jest');

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@tradeclaw/core$': '<rootDir>/../core/src/index.ts',
    '^@tradeclaw/signals$': '<rootDir>/../signals/src/index.ts',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
      },
    },
  },
};
