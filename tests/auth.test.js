const request = require('supertest');
const app = require('../server');
const { users } = require('../auth');

describe('Authentication System', () => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: 'TestPass123!'
  };

  // Clear users before all tests
  beforeAll(() => {
    users.clear();
  });

  describe('POST /api/auth/register', () => {
    let authToken;

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('username', testUser.username);
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body.user).not.toHaveProperty('password');

      authToken = response.body.token;
    });

    it('should reject registration with existing username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Registration failed');
      expect(response.body).toHaveProperty('message', 'User already exists');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'password'
          })
        ])
      );
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser3',
          email: 'invalid-email',
          password: 'TestPass123!'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    describe('POST /api/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: testUser.username,
            password: testUser.password
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
        expect(response.body).toHaveProperty('user');
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('username', testUser.username);
      });

      it('should login with email instead of username', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: testUser.email,
            password: testUser.password
          })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Login successful');
      });

      it('should reject login with invalid password', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: testUser.username,
            password: 'wrongpassword'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication failed');
        expect(response.body).toHaveProperty('message', 'Invalid credentials');
      });

      it('should reject login with non-existent user', async () => {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            username: 'nonexistent',
            password: 'TestPass123!'
          })
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Authentication failed');
      });
    });

    describe('GET /api/auth/profile', () => {
      it('should return user profile with valid token', async () => {
        // First login to get a fresh token
        const loginResponse = await request(app)
          .post('/api/auth/login')
          .send({
            username: testUser.username,
            password: testUser.password
          });

        const token = loginResponse.body.token;

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Profile retrieved successfully');
        expect(response.body).toHaveProperty('user');
        expect(response.body.user).toHaveProperty('username', testUser.username);
        expect(response.body.user).not.toHaveProperty('password');
      });

      it('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body).toHaveProperty('error', 'Access token required');
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', 'Bearer invalid-token')
          .expect(403);

        expect(response.body).toHaveProperty('error', 'Invalid token');
      });
    });
  });
});