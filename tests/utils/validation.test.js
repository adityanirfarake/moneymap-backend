const { validateUser, validateTransaction } = require('../../src/utils/validation');

describe('Validation utilities', () => {
  describe('validateUser', () => {
    it('should return null for valid user data', () => {
      const result = validateUser({
        username: 'johndoe',
        email: 'john@example.com',
        password: 'password123',
      });
      expect(result).toBeNull();
    });

    it('should return error if username is missing or empty', () => {
      expect(validateUser({ username: 'testusername', email: 'a@b.com', password: 'password123' })).toBe('Username is required');
      expect(validateUser({ username: '   ', email: 'a@b.com', password: 'password123' })).toBe('Username is required');
      expect(validateUser({ email: 'a@b.com', password: 'password123' })).toBe('Username is required');
      expect(validateUser({ username: null, email: 'a@b.com', password: 'password123' })).toBe('Username is required');
    });

    it('should return error if email is invalid or missing', () => {
      expect(validateUser({ username: 'john', email: '', password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: null, password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: 'notanemail', password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: 'john@', password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: 'john@domain', password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: '@domain.com', password: 'password123' })).toBe('A valid email is required');
      expect(validateUser({ username: 'john', email: 'john @domain.com', password: 'password123' })).toBe('A valid email is required');
    });

    it('should return error if password is less than 8 characters or missing', () => {
      expect(validateUser({ username: 'john', email: 'john@example.com', password: '' })).toBe('Password must be at least 8 characters');
      expect(validateUser({ username: 'john', email: 'john@example.com', password: null })).toBe('Password must be at least 8 characters');
      expect(validateUser({ username: 'john', email: 'john@example.com', password: '1234567' })).toBe('Password must be at least 8 characters');
    });

    it('should allow valid password with exactly 8 characters or more', () => {
      expect(validateUser({ username: 'john', email: 'john@example.com', password: '12345678' })).toBeNull();
      expect(validateUser({ username: 'john', email: 'john@example.com', password: 'longpassword123!' })).toBeNull();
    });
  });

  describe('validateTransaction', () => {
    it('should return null for valid income transaction', () => {
      const result = validateTransaction({
        type: 'income',
        amount: 2500,
        category: 'Salary',
        transactionDate: '2026-03-15',
      });
      expect(result).toBeNull();
    });

    it('should return null for valid expense transaction', () => {
      const result = validateTransaction({
        type: 'expense',
        amount: 15.5,
        category: 'Food',
        transactionDate: '2026-03-15',
      });
      expect(result).toBeNull();
    });

    it('should return null when transactionDate is omitted or undefined', () => {
      const result = validateTransaction({
        type: 'income',
        amount: '100',
        category: 'Freelance',
      });
      expect(result).toBeNull();
    });

    it('should reject invalid or unsupported transaction types', () => {
      expect(validateTransaction({ type: 'transfer', amount: 100, category: 'Salary' })).toBe('Type must be income or expense');
      expect(validateTransaction({ type: '', amount: 100, category: 'Salary' })).toBe('Type must be income or expense');
      expect(validateTransaction({ type: null, amount: 100, category: 'Salary' })).toBe('Type must be income or expense');
    });

    it('should reject non-positive or non-finite amounts', () => {
      expect(validateTransaction({ type: 'income', amount: 0, category: 'Salary' })).toBe('Amount must be greater than 0');
      expect(validateTransaction({ type: 'income', amount: -50, category: 'Salary' })).toBe('Amount must be greater than 0');
      expect(validateTransaction({ type: 'income', amount: 'abc', category: 'Salary' })).toBe('Amount must be greater than 0');
      expect(validateTransaction({ type: 'income', amount: null, category: 'Salary' })).toBe('Amount must be greater than 0');
      expect(validateTransaction({ type: 'income', amount: Infinity, category: 'Salary' })).toBe('Amount must be greater than 0');
      expect(validateTransaction({ type: 'income', amount: NaN, category: 'Amount must be greater than 0' })).toBe('Amount must be greater than 0');
    });

    it('should reject empty or missing category', () => {
      expect(validateTransaction({ type: 'expense', amount: 10, category: '' })).toBe('Category is required');
      expect(validateTransaction({ type: 'expense', amount: 10, category: '   ' })).toBe('Category is required');
      expect(validateTransaction({ type: 'expense', amount: 10, category: null })).toBe('Category is required');
    });

    it('should reject category not matching transaction type', () => {
      expect(validateTransaction({ type: 'income', amount: 100, category: 'Rent' })).toBe('Category does not match the transaction type');
      expect(validateTransaction({ type: 'expense', amount: 100, category: 'Salary' })).toBe('Category does not match the transaction type');
      expect(validateTransaction({ type: 'income', amount: 100, category: 'NonExistent' })).toBe('Category does not match the transaction type');
    });

    it('should reject invalid transactionDate', () => {
      expect(validateTransaction({
        type: 'income',
        amount: 100,
        category: 'Salary',
        transactionDate: 'invalid-date-string',
      })).toBe('Date must be valid');
    });
  });
});
