const TEST_WEBHOOK_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.WEBHOOK_ENCRYPTION_KEY = process.env.WEBHOOK_ENCRYPTION_KEY || TEST_WEBHOOK_ENCRYPTION_KEY;

const request = require('supertest');
const app = require('../src/index');
const User = require('../src/models/user');
const sequelize = require('../src/config/db');

describe('Auth Service', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  // afterAll(async () => {
  //   await sequelize.close();
  // });

  describe('POST /register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('message', 'User registered'); // Changed
      expect(res.body).toHaveProperty('userId');
      expect(res.body.userId).toBeTruthy();
    });

    it('should reject duplicate email', async () => {
      await request(app)
        .post('/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
        });

      const res = await request(app)
        .post('/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password456',
        });

      expect(res.status).toBe(409); // Changed from 400
      expect(res.body).toHaveProperty('message');
    });

    it('should require email and password', async () => {
      const res = await request(app)
        .post('/register')
        .send({
          email: 'incomplete@example.com',
        });

      expect(res.status).toBe(400); // Changed from 400
    });
  });

  describe('POST /login', () => {
    beforeEach(async () => {
      await sequelize.sync({ force: true });
      await request(app)
        .post('/register')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });
    });

    it('should login successfully and return JWT', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.token).toBeTruthy();
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('message');
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        });

      expect(res.status).toBe(401);
    });
  });
});

describe('POST /api/webhooks', () => {
  let token;
  let userId;

  beforeEach(async () => {
    //Create a user and get JWT token
    await sequelize.sync({ force: true }); // clear and sync database

    const res = await request(app)
      .post('/register')
      .send({
        email: 'webhook@example.com',
        password: 'password123',
      });

    userId = res.body.userId;

    // Login to get token
    const loginRes = await request(app)
      .post('/login')
      .send({
        email: 'webhook@example.com',
        password: 'password123',
      });

    token = loginRes.body.token;
  });

  it('should create a new webhook', async () => {
    const res = await request(app)
      .post('/api/webhooks')
      .set('Authorization', `Bearer ${token}`)
      .send({
        url: 'https://example.com/webhook',
        subscribedEvents: ['notification.sent', 'notification.failed'],
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('url');
    expect(res.body).toHaveProperty('subscribedEvents');
    expect(res.body).toHaveProperty('isEnabled');
    expect(res.body).toHaveProperty('secret');
  });

//   it('should require URL and events', async () => {
//     const res = await request(app)
//       .post('/api/webhooks')
//       .send({
//         url: 'https://example.com/webhook',
//       });

//     expect(res.status).toBe(400);
//   });
 });