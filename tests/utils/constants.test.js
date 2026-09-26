const { incomeCategories, expenseCategories, categoriesByType } = require('../../src/utils/constants');

describe('Constants', () => {
  describe('incomeCategories', () => {
    it('should be an array of non-empty strings', () => {
      expect(Array.isArray(incomeCategories)).toBe(true);
      expect(incomeCategories.length).toBeGreaterThan(0);
      incomeCategories.forEach((cat) => {
        expect(typeof cat).toBe('string');
        expect(cat.trim().length).toBeGreaterThan(0);
      });
    });

    it('should include core income categories', () => {
      expect(incomeCategories).toContain('Salary');
      expect(incomeCategories).toContain('Freelance');
      expect(incomeCategories).toContain('Allowance');
      expect(incomeCategories).toContain('Other Income');
    });
  });

  describe('expenseCategories', () => {
    it('should be an array of non-empty strings', () => {
      expect(Array.isArray(expenseCategories)).toBe(true);
      expect(expenseCategories.length).toBeGreaterThan(0);
      expenseCategories.forEach((cat) => {
        expect(typeof cat).toBe('string');
        expect(cat.trim().length).toBeGreaterThan(0);
      });
    });

    it('should include core expense categories', () => {
      expect(expenseCategories).toContain('Rent');
      expect(expenseCategories).toContain('Food');
      expect(expenseCategories).toContain('Entertainment');
      expect(expenseCategories).toContain('Travel');
      expect(expenseCategories).toContain('Bills');
    });
  });

  describe('categoriesByType', () => {
    it('should map income to incomeCategories', () => {
      expect(categoriesByType.income).toEqual(incomeCategories);
    });

    it('should map expense to expenseCategories', () => {
      expect(categoriesByType.expense).toEqual(expenseCategories);
    });
  });
});
