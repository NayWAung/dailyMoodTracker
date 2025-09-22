// Jest setup file for Daily Mood Tracker tests
// This file runs before each test suite

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_ENCRYPTION_KEY = 'test-key-32-characters-long!!!';

// Global test timeout
jest.setTimeout(10000);

// Suppress console.log in tests unless needed for debugging
if (process.env.DEBUG !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
}