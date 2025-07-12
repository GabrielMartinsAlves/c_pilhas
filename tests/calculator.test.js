const request = require('supertest');
const app = require('../server');
const { users } = require('../auth');

describe('Calculator API', () => {
  let authToken;
  const testUser = {
    username: 'calcuser',
    email: 'calc@example.com',
    password: 'TestPass123!'
  };

  // Clear users and register a test user before all tests
  beforeAll(async () => {
    users.clear();
    
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    authToken = registerResponse.body.token;
  });

  describe('GET /api/calculator/info', () => {
    it('should return calculator information', async () => {
      const response = await request(app)
        .get('/api/calculator/info')
        .expect(200);

      expect(response.body).toHaveProperty('name', 'RPN Calculator Service');
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('supportedOperators');
      expect(response.body.supportedOperators).toContain('+');
      expect(response.body.supportedOperators).toContain('-');
      expect(response.body.supportedOperators).toContain('*');
      expect(response.body.supportedOperators).toContain('/');
      expect(response.body.supportedOperators).toContain('^');
    });
  });

  describe('POST /api/calculator/calculate', () => {
    it('should calculate simple addition', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '3 4 +' })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Calculation completed successfully');
      expect(response.body).toHaveProperty('expression', '3 4 +');
      expect(response.body).toHaveProperty('result', 7);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should calculate complex expression', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '5 1 2 + 4 * + 3 -' })
        .expect(200);

      expect(response.body.result).toBe(14);
    });

    it('should calculate with exponentiation', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '2 3 ^' })
        .expect(200);

      expect(response.body.result).toBe(8);
    });

    it('should return steps when verbose is true', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '3 4 +', verbose: true })
        .expect(200);

      expect(response.body).toHaveProperty('steps');
      expect(Array.isArray(response.body.steps)).toBe(true);
      expect(response.body.steps.length).toBeGreaterThan(0);
    });

    it('should reject calculation without authentication', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .send({ expression: '3 4 +' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    it('should reject empty expression', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('should reject invalid expression', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '3 4 invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Calculation failed');
    });

    it('should handle division by zero', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '5 0 /' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Calculation failed');
      expect(response.body.message).toContain('Division by zero');
    });

    it('should handle insufficient operands', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '3 +' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Calculation failed');
      expect(response.body.message).toContain('too many operators');
    });

    it('should handle malformed expression', async () => {
      const response = await request(app)
        .post('/api/calculator/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ expression: '3 4 5 +' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Calculation failed');
      expect(response.body.message).toContain('Malformed expression');
    });
  });
});