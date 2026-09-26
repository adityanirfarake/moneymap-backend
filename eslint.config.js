module.exports = [
  {
    ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^(next|_|request|response)' }],
      'no-console': 'off',
    },
  },
];
