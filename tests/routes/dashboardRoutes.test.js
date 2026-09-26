const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock pool before requiring the app
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../../src/db/pool');
const app = require('../../src/server');

describe('Dashboard Routes (/api/dashboard)', () => {
  const jwtSecret = 'test-jwt-secret';
  const testUserId = 7;
  let validToken;

  beforeAll(() => {
    process.env.JWT_SECRET = jwtSecret;
    validToken = jwt.sign({ userId: testUserId }, jwtSecret);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Authentication requirement', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const summaryRes = await request(app).get('/api/dashboard/summary');
      expect(summaryRes.status).toBe(401);
      expect(summaryRes.body.message).toBe('Authentication is required');

      const breakdownRes = await request(app).get('/api/dashboard/category-breakdown');
      expect(breakdownRes.status).toBe(401);
      expect(breakdownRes.body.message).toBe('Authentication is required');
    });
  });

  describe('GET /api/dashboard/summary', () => {
    it('should return financial summary with income, expenses, balance, savings, transactionCount', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            income: '5000.50',
            expenses: '2000.25',
            transactionCount: 15,
          },
        ],
      });

      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        summary: {
          income: 5000.5,
          expenses: 2000.25,
          balance: 3000.25,
          savings: 3000.25,
          transactionCount: 15,
        },
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions WHERE user_id = $1'),
        [testUserId]
      );
    });

    it('should handle zero transactions gracefully', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            income: 0,
            expenses: 0,
            transactionCount: 0,
          },
        ],
      });

      const response = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        summary: {
          income: 0,
          expenses: 0,
          balance: 0,
          savings: 0,
          transactionCount: 0,
        },
      });
    });
  });

  describe('GET /api/dashboard/category-breakdown', () => {
    it('should calculate breakdown percentages and identify largest category', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          { category: 'Rent', amount: '1200' },
          { category: 'Food', amount: '600' },
          { category: 'Entertainment', amount: '200' },
        ],
      });

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalExpenses).toBe(2000);
      expect(response.body.breakdown).toEqual([
        { category: 'Rent', amount: 1200, percentage: 60 },
        { category: 'Food', amount: 600, percentage: 30 },
        { category: 'Entertainment', amount: 200, percentage: 10 },
      ]);
      expect(response.body.largestCategory).toEqual({
        category: 'Rent',
        amount: 1200,
        percentage: 60,
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE user_id = $1 AND type = 'expense'"),
        [testUserId]
      );
    });

    it('should return empty breakdown and null largestCategory when no expenses exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        breakdown: [],
        totalExpenses: 0,
        largestCategory: null,
      });
    });

    it('should set percentage to 0 when total expenses are 0', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{ category: 'Food', amount: '0' }],
      });

      const response = await request(app)
        .get('/api/dashboard/category-breakdown')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalExpenses).toBe(0);
      expect(response.body.breakdown).toEqual([
        { category: 'Food', amount: 0, percentage: 0 },
      ]);
    });
  });
});
