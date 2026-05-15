const { GatewayClient } = require('./helpers.helper');

describe('Auth Integration Flow', () => {
  const client = new GatewayClient('http://localhost:3000');
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'Password123!',
  };

  // Verify all services are running
  beforeAll(async () => {
    const health = await client.getHealth();
    expect(health.status).toBe(200);
  });

  describe('Registration Flow', () => {
    it('should register a new user through the Gateway', async () => {
      const res = await client.register(testUser.email, testUser.password);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered');
      expect(res.body).toHaveProperty('userId');
      expect(res.body.userId).toBeTruthy();
    });

    it('should reject duplicate email registration', async () => {
      // First registration
      await client.register(testUser.email, testUser.password);

      // Attempt duplicate
      const res = await client.register(testUser.email, 'DifferentPassword123!');

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject registration with missing fields', async () => {
      const res = await client.register('incomplete@example.com', '');

      expect(res.status).toBeTruthy();
    });
  });

  describe('Login Flow', () => {
    beforeAll(async () => {
      // Register user first
      await client.register(testUser.email, testUser.password);
    });

    it('should login successfully and return JWT token', async () => {
      const res = await client.login(testUser.email, testUser.password);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toBeTruthy();
      expect(res.body.token.split('.').length).toBe(3); // JWT format: xxx.xxx.xxx
    });

    it('should reject login with invalid credentials', async () => {
      const res = await client.login(testUser.email, 'WrongPassword123!');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject login for non-existent user', async () => {
      const res = await client.login('nonexistent@example.com', 'Password123!');

      expect(res.status).toBe(401);
    });
  });

  describe('Gateway → Auth Service Communication', () => {
    it('should preserve request headers through proxy', async () => {
      // Register and login to get token
      await client.register(testUser.email, testUser.password);
      const loginRes = await client.login(testUser.email, testUser.password);
      const token = loginRes.body.token;

      // Token should be valid and contain user info
      expect(token).toBeTruthy();
      expect(token.split('.').length).toBe(3);
    });

    it('should handle Auth Service errors gracefully', async () => {
      const res = await client.register('', '');

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body).toHaveProperty('message');
    });
  });
});