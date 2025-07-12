// Test setup file
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key';
process.env.PORT = 3001;
process.env.RATE_LIMIT_MAX_REQUESTS = 1000; // High limit for tests

// Increase timeout for async operations in tests
jest.setTimeout(10000);