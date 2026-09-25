const incomeCategories = ['Salary', 'Freelance', 'Allowance', 'Other Income'];

const expenseCategories = [
  'Rent',
  'Food',
  'Entertainment',
  'Travel',
  'Mobile Recharge',
  'Shopping',
  'Bills',
  'Health',
  'Education',
  'Miscellaneous',
];

const categoriesByType = {
  income: incomeCategories,
  expense: expenseCategories,
};

module.exports = { incomeCategories, expenseCategories, categoriesByType };