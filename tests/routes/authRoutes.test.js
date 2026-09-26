const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock pool before requiring the app
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../../src/db/pool');
const app = require('../../src/server');

describe('Auth Routes (/api/auth)', () => {
  const jwtSecret = 'test-jwt-secret';
  let consoleErrorSpy;

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('GET /api/auth/register', () => {
    it('should return 405 Method Not Allowed with explanatory message', async () => {
      const response = await request(app).get('/api/auth/register');

      expect(response.status).toBe(405);
      expect(response.body).toEqual({
        message: 'Registration requires a POST request with username, email, and password',
      });
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 if validation fails', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'abc', email: 'bademail', password: '123' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should register a new user successfully and return 201 with token', async () => {
      const mockCreatedUser = {
        id: 10,
        username: 'alice',
        email: 'alice@example.com',
      };
      pool.query.mockResolvedValueOnce({ rows: [mockCreatedUser] });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '  alice  ',
          email: '  Alice@example.COM  ',
          password: 'securepassword123',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toEqual({
        id: 10,
        username: 'alice',
        email: 'alice@example.com',
      });

      // Verify token is valid and decodes to userId
      const decoded = jwt.verify(response.body.token, jwtSecret);
      expect(decoded.userId).toBe(10);

      // Verify DB query parameters
      expect(pool.query).toHaveBeenCalledWith(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
        expect.arrayContaining(['alice', 'alice@example.com', expect.any(String)])
      );
    });

    it('should handle duplicate username/email error (PostgreSQL 23505) and return 409', async () => {
      const duplicateError = new Error('Duplicate key violation');
      duplicateError.code = '23505';
      pool.query.mockRejectedValueOnce(duplicateError);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'alice',
          email: 'alice@example.com',
          password: 'securepassword123',
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        message: 'That username or email is already in use',
      });
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 when email or password is missing', async () => {
      const resWithoutPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(resWithoutPassword.status).toBe(400);
      expect(resWithoutPassword.body.message).toBe('Email and password are required');

      const resWithoutEmail = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(resWithoutEmail.status).toBe(400);
      expect(resWithoutEmail.body.message).toBe('Email and password are required');
    });

    it('should return 401 when user is not found in database', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Incorrect email or password');
    });

    it('should return 401 when password does not match hash', async () => {
      const hash = await bcrypt.hash('correctpassword', 10);
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 5, username: 'bob', email: 'bob@example.com', password_hash: hash }],
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bob@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Incorrect email or password');
    });

    it('should return 200 with token and user on successful login', async () => {
      const password = 'mySecretPassword123';
      const hash = await bcrypt.hash(password, 10);
      pool.query.mockResolvedValueOnce({
        rows: [{ id: 5, username: 'bob', email: 'bob@example.com', password_hash: hash }],
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: '  BOB@example.com ', password });

      expect(response.status).toBe(200);
      expect(response.body.user).toEqual({
        id: 5,
        username: 'bob',
        email: 'bob@example.com',
      });
      expect(response.body).toHaveProperty('token');

      const decoded = jwt.verify(response.body.token, jwtSecret);
      expect(decoded.userId).toBe(5);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 if unauthenticated', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication is required');
    });

    it('should return 404 if user does not exist in database', async () => {
      const token = jwt.sign({ userId: 999 }, jwtSecret);
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    it('should return user info when authenticated and found', async () => {
      const token = jwt.sign({ userId: 15 }, jwtSecret);
      const user = { id: 15, username: 'charlie', email: 'charlie@example.com' };
      pool.query.mockResolvedValueOnce({ rows: [user] });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ user });
      expect(pool.query).toHaveBeenCalledWith(
        'SELECT id, username, email FROM users WHERE id = $1',
        [15]
      );
    });
  });
});
