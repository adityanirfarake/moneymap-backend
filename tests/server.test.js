const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock pool
jest.mock('../src/db/pool', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../src/db/pool');
const app = require('../src/server');

describe('Server Application & Error Middleware', () => {
  let consoleErrorSpy;
  const jwtSecret = 'test-jwt-secret';
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
    validToken = jwt.sign({ userId: 1 }, jwtSecret);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('GET /health', () => {
    it('should return 200 with health status and message', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        commit: expect.any(String),
        message: 'MoneyMap backend is running',
      });
    });
  });

  describe('CORS configuration', () => {
    it('should include CORS allow origin header matching allowed origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:5173');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    });
  });

  describe('Error handling middleware', () => {
    it('should handle PostgreSQL foreign key violation (23503) with 400', async () => {
      const fkError = new Error('Foreign key constraint violation');
      fkError.code = '23503';
      pool.query.mockRejectedValueOnce(fkError);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'The submitted data is not valid',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(fkError);
    });

    it('should handle PostgreSQL invalid text representation (22P02) with 400', async () => {
      const syntaxError = new Error('Invalid text representation');
      syntaxError.code = '22P02';
      pool.query.mockRejectedValueOnce(syntaxError);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: 'The submitted data is not valid',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(syntaxError);
    });

    it('should handle generic server errors with 500', async () => {
      const genericError = new Error('Database connection timeout');
      pool.query.mockRejectedValueOnce(genericError);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        message: 'Something went wrong on the server',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(genericError);
    });
  });
});
