// __tests__/helpers/mockRedis.js
// Mock Redis client for testing

class MockRedis {
  constructor() {
    this.store = {};
    this.queue = [];
  }

  async connect() {
    return this;
  }

  async disconnect() {
    return this;
  }

  async lPush(key, value) {
    if (!this.store[key]) {
      this.store[key] = [];
    }
    this.store[key].unshift(value);
    return this.store[key].length;
  }

  async rPop(key) {
    if (!this.store[key] || this.store[key].length === 0) {
      return null;
    }
    return this.store[key].pop();
  }

  async brPop(key, timeout) {
    // Simulate blocking pop with timeout
    if (!this.store[key] || this.store[key].length === 0) {
      return null;
    }
    const value = this.store[key].pop();
    return {
      element: value,
      key: key,
    };
  }

  async zadd(key, score, value) {
    if (!this.store[key]) {
      this.store[key] = [];
    }
    this.store[key].push({ score, value });
    return 1;
  }

  async zrangebyscore(key, min, max) {
    if (!this.store[key]) {
      return [];
    }
    return this.store[key]
      .filter((item) => item.score >= min && item.score <= max)
      .map((item) => item.value);
  }

  async zrem(key, value) {
    if (!this.store[key]) {
      return 0;
    }
    const initialLength = this.store[key].length;
    this.store[key] = this.store[key].filter((item) => item.value !== value);
    return initialLength - this.store[key].length;
  }

  async flushAll() {
    this.store = {};
    return 'OK';
  }

  getStore() {
    return this.store;
  }
}

module.exports = MockRedis;
