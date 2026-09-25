const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const requireAuth = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { validateUser } = require('../utils/validation');

const router = express.Router();

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function publicUser(user) {
  return { id: user.id, username: user.username, email: user.email };
}

router.post('/register', asyncHandler(async (request, response) => {
  const { username, email, password } = request.body;
  const validationError = validateUser({ username, email, password });
  if (validationError) return response.status(400).json({ message: validationError });

  const result = await pool.query(
    'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
    [username.trim(), email.trim().toLowerCase(), await bcrypt.hash(password, 10)],
  );
  const user = result.rows[0];
  return response.status(201).json({ token: createToken(user.id), user: publicUser(user) });
}));

router.post('/login', asyncHandler(async (request, response) => {
  const { email, password } = request.body;
  if (!email || !password) return response.status(400).json({ message: 'Email and password are required' });

  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.trim().toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return response.status(401).json({ message: 'Incorrect email or password' });
  }

  return response.json({ token: createToken(user.id), user: publicUser(user) });
}));

router.get('/me', requireAuth, asyncHandler(async (request, response) => {
  const result = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [request.userId]);
  if (!result.rows[0]) return response.status(404).json({ message: 'User not found' });
  return response.json({ user: result.rows[0] });
}));

module.exports = router;