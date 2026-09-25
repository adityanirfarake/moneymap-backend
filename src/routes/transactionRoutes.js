const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validateTransaction } = require('../utils/validation');

const router = express.Router();

function formatTransaction(row) {
  return { ...row, amount: Number(row.amount) };
}

router.use(requireAuth);

router.get('/', asyncHandler(async (request, response) => {
  const result = await pool.query(
    'SELECT id, user_id AS "userId", type, amount, category, description, transaction_date AS date, created_at AS "createdAt", updated_at AS "updatedAt" FROM transactions WHERE user_id = $1 ORDER BY transaction_date DESC, created_at DESC',
    [request.userId],
  );
  return response.json({ transactions: result.rows.map(formatTransaction) });
}));

router.get('/:id', asyncHandler(async (request, response) => {
  const result = await pool.query(
    'SELECT id, user_id AS "userId", type, amount, category, description, transaction_date AS date, created_at AS "createdAt", updated_at AS "updatedAt" FROM transactions WHERE id = $1 AND user_id = $2',
    [request.params.id, request.userId],
  );
  if (!result.rows[0]) return response.status(404).json({ message: 'Transaction not found' });
  return response.json({ transaction: formatTransaction(result.rows[0]) });
}));

router.post('/', asyncHandler(async (request, response) => {
  const { type, amount, category, description = '', date, transactionDate } = request.body;
  const normalizedDate = transactionDate || date;
  const validationError = validateTransaction({ type, amount, category, transactionDate: normalizedDate });
  if (validationError) return response.status(400).json({ message: validationError });

  const result = await pool.query(
    'INSERT INTO transactions (user_id, type, amount, category, description, transaction_date) VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE)) RETURNING id, user_id AS "userId", type, amount, category, description, transaction_date AS date, created_at AS "createdAt", updated_at AS "updatedAt"',
    [request.userId, type, amount, category.trim(), description.trim(), normalizedDate || null],
  );
  return response.status(201).json({ transaction: formatTransaction(result.rows[0]) });
}));

router.put('/:id', asyncHandler(async (request, response) => {
  const currentResult = await pool.query('SELECT * FROM transactions WHERE id = $1 AND user_id = $2', [request.params.id, request.userId]);
  if (!currentResult.rows[0]) return response.status(404).json({ message: 'Transaction not found' });

  const current = currentResult.rows[0];
  const next = {
    type: request.body.type ?? current.type,
    amount: request.body.amount ?? current.amount,
    category: request.body.category ?? current.category,
    description: request.body.description ?? current.description,
    transactionDate: request.body.transactionDate ?? request.body.date ?? current.transaction_date,
  };
  const validationError = validateTransaction(next);
  if (validationError) return response.status(400).json({ message: validationError });

  const result = await pool.query(
    'UPDATE transactions SET type = $1, amount = $2, category = $3, description = $4, transaction_date = $5, updated_at = NOW() WHERE id = $6 AND user_id = $7 RETURNING id, user_id AS "userId", type, amount, category, description, transaction_date AS date, created_at AS "createdAt", updated_at AS "updatedAt"',
    [next.type, next.amount, next.category.trim(), next.description.trim(), next.transactionDate, request.params.id, request.userId],
  );
  return response.json({ transaction: formatTransaction(result.rows[0]) });
}));

router.delete('/:id', asyncHandler(async (request, response) => {
  const result = await pool.query('DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING id', [request.params.id, request.userId]);
  if (!result.rows[0]) return response.status(404).json({ message: 'Transaction not found' });
  return response.status(204).send();
}));

module.exports = router;