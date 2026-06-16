// jest.setup.js
// Global test setup and configuration

// Silence logs during tests
const logger = require('./src/config/logger');
logger.silent = true;

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Ensure all timers are cleared
afterEach(() => {
  jest.clearAllTimers();
});

// Ensure all mocks are cleared
afterEach(() => {
  jest.clearAllMocks();
});
