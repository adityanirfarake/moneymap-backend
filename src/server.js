const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (request, response) => {
  response.json({ status: 'ok', message: 'MoneyMap backend is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use((error, request, response, next) => {
  console.error(error);
  if (error.code === '23505') {
    return response.status(409).json({ message: 'That username or email is already in use' });
  }
  if (error.code === '23503' || error.code === '22P02') {
    return response.status(400).json({ message: 'The submitted data is not valid' });
  }
  response.status(500).json({ message: 'Something went wrong on the server' });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`MoneyMap backend running on http://localhost:${port}`);
  });
}

module.exports = app;