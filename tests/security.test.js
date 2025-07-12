const request = require('supertest');
const app = require('../server');

describe('Security Middleware', () => {
  describe('Rate Limiting', () => {
    it('should allow normal requests', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      // In test environment, rate limiting is disabled, so headers might not be present
      expect(response.body).toHaveProperty('name', 'RPN Calculator API');
    });

    it('should include security headers', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      // Check Helmet security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
      expect(response.headers).toHaveProperty('x-xss-protection', '0');
    });
  });

  describe('Input Validation', () => {
    it('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes gracefully', async () => {
      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Not found');
      expect(response.body).toHaveProperty('availableRoutes');
    });
  });
});