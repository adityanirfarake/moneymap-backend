const express = require('express');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
router.use(requireAuth);

router.get('/summary', asyncHandler(async (request, response) => {
  const result = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expenses,
      COUNT(*)::integer AS "transactionCount"
    FROM transactions WHERE user_id = $1`,
    [request.userId],
  );
  const row = result.rows[0];
  const income = Number(row.income);
  const expenses = Number(row.expenses);
  return response.json({ summary: { income, expenses, balance: income - expenses, savings: income - expenses, transactionCount: row.transactionCount } });
}));

router.get('/category-breakdown', asyncHandler(async (request, response) => {
  const result = await pool.query(
    `SELECT category, SUM(amount)::numeric AS amount
     FROM transactions WHERE user_id = $1 AND type = 'expense'
     GROUP BY category ORDER BY amount DESC`,
    [request.userId],
  );
  const total = result.rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const breakdown = result.rows.map((row) => ({
    category: row.category,
    amount: Number(row.amount),
    percentage: total ? Number(((Number(row.amount) / total) * 100).toFixed(1)) : 0,
  }));
  return response.json({ breakdown, totalExpenses: total, largestCategory: breakdown[0] || null });
}));

module.exports = router;