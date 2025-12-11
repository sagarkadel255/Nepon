module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  testEnvironment: 'node',
  testMatch: ['**/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  // Bumped from the 5s default — the in-memory Mongo cold-start plus
  // Express boot + a few HTTP round-trips can exceed 5s on first run.
  testTimeout: 30000,
  // Force serial execution: setup.ts stands up a shared in-memory Mongo
  // per suite; parallel workers would race the download/start-up.
  maxWorkers: 1,
  // Silence the "worker failed to exit gracefully" tail — Redis client
  // fallback keeps the loop alive after tests complete but does not
  // affect results.
  forceExit: true,
};
