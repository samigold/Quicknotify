# Webhook Service Testing Guide

## Setup Complete ✅

Your webhook-service testing infrastructure is now configured. Here's what was set up:

### Installed Dependencies
- `jest` - Testing framework
- `jest-mock-extended` - Enhanced mocking utilities
- `redis-mock` - In-memory Redis for testing
- `nock` - HTTP request mocking
- `dotenv-cli` - Environment variable management

### Created Files

#### Configuration
- `jest.config.js` - Jest configuration with coverage thresholds
- `jest.setup.js` - Global test setup (silencing logs, environment setup)

#### Test Structure
```
__tests__/
├── unit/               # Unit tests for individual modules
├── integration/        # Integration tests for combined modules
└── helpers/           # Test utilities and mocks
    ├── mockRedis.js        # Mock Redis client
    ├── mockRabbitMQ.js     # Mock RabbitMQ channel
    └── testData.js         # Common test data and fixtures
```

#### CI/CD Pipeline
- Updated `.github/workflows/ci-cd.yml` with:
  - Redis and RabbitMQ services for webhook-service tests
  - Proper health checks
  - Coverage reporting
  - Webhook-service included in final-status job

### Available NPM Scripts

```bash
npm test                  # Run all tests with --forceExit
npm run test:watch      # Run tests in watch mode (for development)
npm run test:coverage   # Generate coverage report
npm run test:unit       # Run only unit tests
npm run test:integration # Run only integration tests
```

---

## Next Steps: Write Tests

You're ready to write tests! Here's the recommended order:

### 1. Unit Tests (Easiest to Hardest)

**a) webhookSigner.test.js** (Easiest - No dependencies)
- Test: `signWebhookPayload()` - Generate HMAC signatures
- Test: `createWebhookHeaders()` - Create signed headers
- Scenarios: Valid signature, different secrets, payload variations

**b) eventConsumer.test.js**
- Mock: RabbitMQ channel
- Test: Queue assertion
- Test: Message consumption and job queuing
- Scenarios: Valid event, malformed JSON, ack/nack behavior

**c) jobWorker.test.js**
- Mock: Redis client
- Mock: Timers (for retry backoff)
- Test: Job processing loop
- Test: Retry logic with exponential backoff
- Scenarios: Successful job, failed job, max retries

**d) webhookDelivery.test.js**
- Mock: HTTP requests (using nock)
- Test: Successful delivery
- Test: Error handling (timeout, 5XX, network errors)
- Test: Signature validation
- Scenarios: 200-299, 4XX, 5XX, timeout

**e) Config Tests (Redis, RabbitMQ)**
- Mock: Connection calls
- Test: Connection establishment
- Test: Error handling
- Scenarios: Success, timeout, auth failure

### 2. Integration Tests

**a) eventFlow.integration.test.js**
- Test: Full event → job → delivery flow
- Setup: Mock RabbitMQ and Redis
- Scenario: Event arrives → Job created → Processed

**b) retryLogic.integration.test.js**
- Test: Retry mechanism with backoff
- Setup: Mock delivery failure
- Scenario: Delivery fails → Job re-queued with backoff

### 3. Optional E2E Tests
- Test with real or Testcontainers Redis/RabbitMQ
- Full flow from event publishing to webhook delivery

---

## Test File Template

```javascript
// __tests__/unit/moduleName.test.js
const { function } = require('../../src/path/to/module');

describe('Module Name', () => {
  describe('functionName', () => {
    beforeEach(() => {
      // Setup before each test
    });

    afterEach(() => {
      // Cleanup after each test
    });

    it('should do something when condition is met', () => {
      // Arrange
      const input = {};
      
      // Act
      const result = function(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

---

## Quick Start Example

**Run tests:**
```bash
cd webhook-service
npm install
npm test
```

**Run with coverage:**
```bash
npm run test:coverage
```

**Run in watch mode (while developing):**
```bash
npm run test:watch
```

---

## Mock Usage Examples

### Using MockRedis
```javascript
const MockRedis = require('../helpers/mockRedis');

const redis = new MockRedis();
await redis.lPush('webhook:jobs', JSON.stringify(job));
const popped = await redis.rPop('webhook:jobs');
```

### Using MockRabbitMQ
```javascript
const { MockConnection } = require('../helpers/mockRabbitMQ');

const connection = new MockConnection();
const channel = await connection.createChannel();
await channel.assertQueue('delivery.completed');
channel.sendToQueue('delivery.completed', Buffer.from(JSON.stringify(event)));
```

### Using Nock for HTTP Mocking
```javascript
const nock = require('nock');

nock('https://webhook.site')
  .post('/12345678')
  .reply(200, { success: true });
```

---

## Coverage Targets

```
coverageThreshold: {
  global: {
    branches: 70%
    functions: 75%
    lines: 75%
    statements: 75%
  }
}
```

These are minimum thresholds. Aim higher! 🎯

---

## Common Issues & Solutions

### Issue: Tests timeout
**Solution:** Increase timeout in jest.setup.js or specific test
```javascript
jest.setTimeout(15000); // 15 seconds
```

### Issue: Can't access mocked module
**Solution:** Use `jest.mock()` at top of test file
```javascript
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(),
}));
```

### Issue: Environment variables not set
**Solution:** Add to jest.setup.js or test file
```javascript
process.env.REDIS_URL = 'redis://localhost:6379';
```

---

## CI/CD Pipeline

Your webhook-service tests will now run on:
- Every push to `main` or `develop`
- Every pull request

Results appear in GitHub Actions with:
- ✅ Individual test results
- ✅ Coverage reports
- ✅ Fail/pass status blocking merges

---

## Tips for Success

1. **Start small** - Write unit tests for simple modules first
2. **Use mocks liberally** - Never make real network/DB calls in tests
3. **Test edge cases** - Not just the happy path
4. **Keep tests fast** - Aim for <1 second per test
5. **Use meaningful names** - `it('should retry failed delivery with exponential backoff')`
6. **One assertion per test** - Keep tests focused
7. **Use beforeEach/afterEach** - Avoid code duplication
8. **Run tests frequently** - `npm run test:watch`

---

## Good Luck! 🚀

You're all set to write comprehensive tests for webhook-service. Start with the simplest modules and work your way up. Happy testing!
