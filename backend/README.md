# Rent Manager (Full Stack) — React + Vite + Node/Express + Prisma

Rent Manager es una aplicación web para gestionar alquileres: unidades, inquilinos, contratos (leases), facturas (invoices) y pagos (payments). Incluye dashboard con estados de deuda y soporte para registrar pagos con métodos como cash, transfer, yape, plin, etc.

## ✨ Features
- **Units**: crear, listar y eliminar unidades
- **Tenants**: crear y listar inquilinos (con foto opcional vía Cloudinary)
- **Leases**: contratos activos, monto de renta, dueDay, fechas
- **Invoices**: generación/listado por periodo, estado (PENDING, PARTIAL, PAID, OVERDUE)
- **Payments**: registrar pagos y actualizar balances
- **Dashboard**: métricas rápidas (pendientes, vencidos, parciales) y lista de próximos vencimientos

## 🧱 Stack
**Frontend**
- React + Vite
- React Router
- Deploy: Vercel

**Backend**
- Node.js + Express
- Prisma ORM
- Deploy: Render

**Database**
- Prisma (SQLite en local)
- Recomendado para hosting gratis: Postgres (Neon/Supabase) para persistencia

## 📁 Estructura
backend/
├─ prisma/
│  └─ schema.prisma
├─ src/
│  ├─ db.js
│  ├─ server.js
│  
├─ data/
│  └─ rent.db
├─ .env
└─ package.json


frontend/
├─ src/
│  ├─ api/
│  │  └─ client.js
│  ├─ components/
│  │  ├─ Layout.jsx
│  │  └─ Nav.jsx
│  ├─ pages/
│  │  ├─ Dashboard.jsx
│  │  ├─ Units.jsx
│  │  ├─ Tenants.jsx
│  │  ├─ Leases.jsx
│  │  ├─ Invoices.jsx
│  │  └─ MonthlySummary.jsx
│  ├─ styles.css
│  ├─ App.jsx
│  └─ main.jsx
├─ .env
└─ package.json

1) Backend
cd backend
npm install
npm run dev
# API en http://localhost:4000

2) Backend
cd frontend
npm install
npm run dev
# App en http://localhost:5173