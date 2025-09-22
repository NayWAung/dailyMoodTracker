module.exports = {
  testEnvironment: 'node',
  verbose: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!**/node_modules/**',
    '!**/coverage/**',
  ],
  rootDir: '../',
  roots: ['<rootDir>/tests', '<rootDir>/backend'],
  testMatch: [
    '**/tests/**/*.js',
    '!**/tests/setup.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
  moduleDirectories: ['node_modules', '<rootDir>/backend/node_modules'],
};