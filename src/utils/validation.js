const { categoriesByType } = require('./constants');

function validateUser({ username, email, password }) {
  if (!username || !username.trim()) return 'Username is required';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'A valid email is required';
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  return null;
}

function validateTransaction({ type, amount, category, transactionDate }) {
  if (!['income', 'expense'].includes(type)) return 'Type must be income or expense';
  if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) return 'Amount must be greater than 0';
  if (!category || !category.trim()) return 'Category is required';
  if (!categoriesByType[type].includes(category)) return 'Category does not match the transaction type';
  if (transactionDate && Number.isNaN(Date.parse(transactionDate))) return 'Date must be valid';
  return null;
}

module.exports = { validateUser, validateTransaction };