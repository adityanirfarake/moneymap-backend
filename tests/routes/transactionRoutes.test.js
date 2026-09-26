const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock pool before requiring the app
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../../src/db/pool');
const app = require('../../src/server');

describe('Transaction Routes (/api/transactions)', () => {
  const jwtSecret = 'test-jwt-secret';
  const testUserId = 3;
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
    it('should return 401 when request lacks authorization token', async () => {
      const response = await request(app).get('/api/transactions');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication is required');
    });
  });

  describe('GET /api/transactions', () => {
    it('should return all transactions formatted with numeric amounts for user', async () => {
      const mockRows = [
        {
          id: 1,
          userId: testUserId,
          type: 'income',
          amount: '3000.00',
          category: 'Salary',
          description: 'Monthly salary',
          date: '2026-03-01T00:00:00.000Z',
          createdAt: '2026-03-01T10:00:00.000Z',
          updatedAt: '2026-03-01T10:00:00.000Z',
        },
        {
          id: 2,
          userId: testUserId,
          type: 'expense',
          amount: '45.50',
          category: 'Food',
          description: 'Dinner',
          date: '2026-03-02T00:00:00.000Z',
          createdAt: '2026-03-02T10:00:00.000Z',
          updatedAt: '2026-03-02T10:00:00.000Z',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.transactions[0].amount).toBe(3000);
      expect(response.body.transactions[1].amount).toBe(45.5);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM transactions WHERE user_id = $1'),
        [testUserId]
      );
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return 404 when transaction is not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/transactions/999')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction not found');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        ['999', testUserId]
      );
    });

    it('should return 200 and formatted transaction when found', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 10,
            userId: testUserId,
            type: 'expense',
            amount: '120.00',
            category: 'Bills',
            description: 'Electricity',
            date: '2026-03-05',
          },
        ],
      });

      const response = await request(app)
        .get('/api/transactions/10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.transaction).toEqual({
        id: 10,
        userId: testUserId,
        type: 'expense',
        amount: 120,
        category: 'Bills',
        description: 'Electricity',
        date: '2026-03-05',
      });
    });
  });

  describe('POST /api/transactions', () => {
    it('should return 400 when validation fails', async () => {
      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'invalidType',
          amount: -10,
          category: 'Unknown',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
      expect(pool.query).not.toHaveBeenCalled();
    });

    it('should create transaction successfully with transactionDate and return 201', async () => {
      const createdRow = {
        id: 11,
        userId: testUserId,
        type: 'expense',
        amount: '85.50',
        category: 'Travel',
        description: 'Train ticket',
        date: '2026-03-10',
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
      };
      pool.query.mockResolvedValueOnce({ rows: [createdRow] });

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'expense',
          amount: 85.5,
          category: 'Travel',
          description: 'Train ticket',
          transactionDate: '2026-03-10',
        });

      expect(response.status).toBe(201);
      expect(response.body.transaction).toEqual({
        ...createdRow,
        amount: 85.5,
      });
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [testUserId, 'expense', 85.5, 'Travel', 'Train ticket', '2026-03-10']
      );
    });

    it('should support date property alias and default description to empty string', async () => {
      const createdRow = {
        id: 12,
        userId: testUserId,
        type: 'income',
        amount: '150.00',
        category: 'Freelance',
        description: '',
        date: '2026-03-12',
        createdAt: '2026-03-12T12:00:00.000Z',
        updatedAt: '2026-03-12T12:00:00.000Z',
      };
      pool.query.mockResolvedValueOnce({ rows: [createdRow] });

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'income',
          amount: 150,
          category: 'Freelance',
          date: '2026-03-12',
        });

      expect(response.status).toBe(201);
      expect(response.body.transaction.amount).toBe(150);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [testUserId, 'income', 150, 'Freelance', '', '2026-03-12']
      );
    });

    it('should create transaction without date (falling back to null in query param to use CURRENT_DATE)', async () => {
      const createdRow = {
        id: 13,
        userId: testUserId,
        type: 'expense',
        amount: '20.00',
        category: 'Food',
        description: 'Snack',
        date: '2026-03-15',
        createdAt: '2026-03-15T12:00:00.000Z',
        updatedAt: '2026-03-15T12:00:00.000Z',
      };
      pool.query.mockResolvedValueOnce({ rows: [createdRow] });

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          type: 'expense',
          amount: 20,
          category: 'Food',
          description: 'Snack',
        });

      expect(response.status).toBe(201);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO transactions'),
        [testUserId, 'expense', 20, 'Food', 'Snack', null]
      );
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('should return 404 when transaction to update does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .put('/api/transactions/45')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: 200 });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction not found');
    });

    it('should return 400 when update payload results in validation error', async () => {
      const existing = {
        id: 20,
        user_id: testUserId,
        type: 'expense',
        amount: '50.00',
        category: 'Food',
        description: 'Lunch',
        transaction_date: '2026-03-01',
      };
      pool.query.mockResolvedValueOnce({ rows: [existing] });

      const response = await request(app)
        .put('/api/transactions/20')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: -5 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Amount must be greater than 0');
    });

    it('should successfully update transaction with partial payload', async () => {
      const existing = {
        id: 20,
        user_id: testUserId,
        type: 'expense',
        amount: '50.00',
        category: 'Food',
        description: 'Lunch',
        transaction_date: '2026-03-01',
      };
      const updatedRow = {
        id: 20,
        userId: testUserId,
        type: 'expense',
        amount: '75.00',
        category: 'Food',
        description: 'Dinner with colleagues',
        date: '2026-03-01',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T11:00:00.000Z',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [existing] }) // SELECT current
        .mockResolvedValueOnce({ rows: [updatedRow] }); // UPDATE

      const response = await request(app)
        .put('/api/transactions/20')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ amount: 75, description: 'Dinner with colleagues' });

      expect(response.status).toBe(200);
      expect(response.body.transaction).toEqual({
        ...updatedRow,
        amount: 75,
      });
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE transactions SET'),
        ['expense', 75, 'Food', 'Dinner with colleagues', '2026-03-01', '20', testUserId]
      );
    });

    it('should preserve type, amount, and date when only category is updated', async () => {
      const existing = {
        id: 21,
        user_id: testUserId,
        type: 'income',
        amount: '500.00',
        category: 'Salary',
        description: 'Initial',
        transaction_date: '2026-03-01',
      };
      const updatedRow = {
        id: 21,
        userId: testUserId,
        type: 'income',
        amount: '500.00',
        category: 'Freelance',
        description: 'Initial',
        date: '2026-03-01',
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-01T11:00:00.000Z',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [existing] })
        .mockResolvedValueOnce({ rows: [updatedRow] });

      const response = await request(app)
        .put('/api/transactions/21')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ category: 'Freelance' });

      expect(response.status).toBe(200);
      expect(pool.query).toHaveBeenLastCalledWith(
        expect.stringContaining('UPDATE transactions SET'),
        ['income', '500.00', 'Freelance', 'Initial', '2026-03-01', '21', testUserId]
      );
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('should return 404 when transaction to delete does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .delete('/api/transactions/88')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Transaction not found');
    });

    it('should return 204 when transaction is successfully deleted', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ id: 88 }] });

      const response = await request(app)
        .delete('/api/transactions/88')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id',
        ['88', testUserId]
      );
    });
  });

  describe('DELETE /api/transactions', () => {
    it('should delete all transactions for user and return rowCount', async () => {
      pool.query.mockResolvedValueOnce({ rowCount: 14 });

      const response = await request(app)
        .delete('/api/transactions')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Transaction history cleared',
        deletedCount: 14,
      });
      expect(pool.query).toHaveBeenCalledWith(
        'DELETE FROM transactions WHERE user_id = $1 RETURNING id',
        [testUserId]
      );
    });
  });
});
