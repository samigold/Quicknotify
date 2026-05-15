module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.integration.test.js'],
  testPathIgnorePatterns: ['helpers.helper.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 15000,
};