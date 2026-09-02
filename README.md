# Mini ERP + CRM Operations Portal

Full-stack case-study project using React + TypeScript, Express + TypeScript, PostgreSQL and Prisma.

## Quick start
1. Copy `backend/.env.example` to `backend/.env`.
2. Copy `frontend/.env.example` to `frontend/.env`.
3. Run `docker compose up --build`.
4. In another terminal:
   `docker compose exec backend npx prisma migrate dev --name init`
5. Seed:
   `docker compose exec backend npm run prisma:seed`

Frontend: http://localhost:5173
Backend: http://localhost:5000

## Test users
- admin@example.com / Admin@123
- sales@example.com / Sales@123
- warehouse@example.com / Warehouse@123
- accounts@example.com / Accounts@123

## Challan inventory rule
Draft: no deduction. Issued: deduct stock exactly once, atomically, and create OUT inventory logs. Paid: no inventory change.
