# MoneyMap

MoneyMap is a simple personal finance and expense management POC. It uses a React frontend, an Express REST API, and PostgreSQL for persistent data.

## Features

- Account registration and login with bcrypt password hashing.
- JWT-based sessions and protected financial routes.
- Income and expense transaction CRUD.
- Dashboard totals for income, expenses, balance, and transaction count.
- Category breakdown with percentages and largest expense category.
- Responsive Money Map view with a simple spending chart.
- Saving Map with salary, savings target, category budgets, and overspending suggestions.

## Technology stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Database: PostgreSQL
- Authentication: bcrypt and JSON Web Tokens
- Deployment target: Render

## Requirements

- Node.js 18 or newer
- npm
- A PostgreSQL database, either local or hosted

PowerShell on this machine blocks the `npm.ps1` command. Use `npm.cmd` in the commands below, or update your user execution policy if you prefer plain `npm`.

## Local setup

### 1. Create the database

Create a PostgreSQL database named `moneymap`, then apply the schema. With PostgreSQL installed and `psql` available:

```powershell
createdb moneymap
psql -d moneymap -f moneymap-backend/src/db/schema.sql
```

You can also run the SQL in `moneymap-backend/src/db/schema.sql` using pgAdmin or a hosted PostgreSQL provider.

### 2. Configure the backend

```powershell
cd moneymap-backend
copy .env.example .env
```

Set these values in `.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://username:password@localhost:5432/moneymap
JWT_SECRET=replace-this-with-a-long-random-secret
```

Do not commit `.env` or put real credentials in source files.

### 3. Start the backend

```powershell
npm.cmd install
npm.cmd run dev
```

The API runs at `http://localhost:5000`. Verify it with `http://localhost:5000/health`.

### 4. Start the frontend

In a second terminal:

```powershell
cd moneymap-frontend
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173` in your browser.

### 5. Run backend unit tests

```powershell
cd moneymap-backend
npm.cmd test
npm.cmd run test:coverage
```

## API overview

Public endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /health`

Protected endpoints require `Authorization: Bearer <token>`:

- `GET /api/auth/me`
- `GET|POST /api/transactions`
- `GET|PUT|DELETE /api/transactions/:id`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/category-breakdown`

All transaction queries include the authenticated user ID, so users cannot read or modify another user's data.

## Render deployment

Create a Render PostgreSQL database and a Render web service for `moneymap-backend`. Set the service root directory to `moneymap-backend`, build command to `npm install`, and start command to `npm start`.

Add these Render environment variables:

- `DATABASE_URL`: the internal Render PostgreSQL connection string.
- `JWT_SECRET`: a long random secret.
- `FRONTEND_URL`: the deployed frontend URL.
- `PORT`: Render supplies this automatically, so it can usually be omitted.

Build the frontend with `npm run build` from `moneymap-frontend` and deploy the generated `dist` directory using a static site. Set `VITE_API_URL` to the deployed backend API URL ending in `/api`.

## Future enhancements

Budget goals, recurring transactions, CSV export, password reset, pagination, stronger rate limiting, and richer charting can be added after this POC.