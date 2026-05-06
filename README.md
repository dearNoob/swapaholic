# Swapaholic

[![Frontend](https://img.shields.io/badge/Frontend-Next.js_16-black?style=for-the-badge&logo=next.js)](https://swapaholic.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-Express.js-000000?style=for-the-badge&logo=express)](https://swapaholic-api-service.onrender.com)
[![Database](https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Realtime](https://img.shields.io/badge/Realtime-Socket.IO-010101?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Language](https://img.shields.io/badge/Language-TypeScript_+_JavaScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](#tech-stack)

Swapaholic is a capstone full-stack re-commerce platform built for buying and selling second-hand products through direct listing and live auction workflows. The project combines marketplace operations, secure authentication, payments, quality-control checks, logistics handling, and role-based dashboards inside a single web application.

The repository includes a Next.js frontend, an Express API, MongoDB data models, Socket.IO-powered realtime updates, and deployment-ready configuration for Vercel and Render.

## Table of Contents

- [Live Demo](#live-demo)
- [Project Status](#project-status)
- [Core Capabilities](#core-capabilities)
- [Verified End-to-End Flow](#verified-end-to-end-flow)
- [Repository Snapshot](#repository-snapshot)
- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Local Docker Setup](#local-docker-setup)
- [Testing and Verification](#testing-and-verification)
- [Deployment Notes](#deployment-notes)
- [Screenshots](#screenshots)

## Live Demo

| Service | URL |
| --- | --- |
| Frontend | [https://swapaholic.vercel.app/](https://swapaholic.vercel.app/) |
| Backend API | [https://swapaholic-api-service.onrender.com](https://swapaholic-api-service.onrender.com) |
| Health Check | [https://swapaholic-api-service.onrender.com/health](https://swapaholic-api-service.onrender.com/health) |

## Project Status

Swapaholic is an active capstone and portfolio project. The repository already contains substantial implementation across marketplace flows, authentication, payment handling, QC, logistics, and dashboards, but some parts of the product are still being refined and stabilized.

This README intentionally focuses on repo-verified behavior and checked project structure rather than broad product claims.

## Core Capabilities

### Marketplace and Auction

- Product listing, browsing, search, and detail pages
- Fixed-price and auction-oriented product flows
- Realtime bidding with Socket.IO updates
- Auto-bid endpoints and bid tracking models
- Wishlist support and recently viewed product history

### Authentication and Account Security

- JWT-based authentication
- OTP verification flows for phone verification, password reset, and login support
- Two-factor authentication with TOTP
- Role-based access across buyer, seller, admin, logistics, QC, and delivery-related flows
- Login history and account status tracking in the user model

### Payments, QC, and Logistics

- Stripe-backed payment flow plus local payment method modeling
- Mock gateway support for development and smoke testing
- Quality-control verification records and approval workflows
- Logistics task handling, delivery status updates, and payout release flow
- Admin oversight for moderation, analytics, and operational actions

### Realtime and Operational Visibility

- Socket.IO notifications for bid, order, payout, and delivery events
- Seller, buyer, admin, and logistics dashboards
- Backend health endpoint and dashboard smoke-test script
- Deployment guidance for Vercel and Render

### AI-Assisted Product Workflow

- Gemini-backed listing assistance in the product controller
- Hugging Face integration for image and product-analysis fallback logic
- AI-oriented product description and pricing support in backend flow design

## Verified End-to-End Flow

The repository contains a live smoke workflow in `backend/src/scripts/live-dashboard-smoke.js` that exercises a multi-role journey across the application. At a high level, that script validates this operational path:

1. A seller account is created and verified.
2. A buyer account is created and verified.
3. A logistics officer is registered, approved, and authenticated through admin flow.
4. The seller creates listings and the buyer places bids.
5. The seller accepts the highest bid and the buyer confirms the auction win.
6. A payment record is created and processed through the mock payment path.
7. QC is initiated and approved.
8. Logistics pickup, in-transit, and delivery completion steps are executed.
9. An admin releases payout to the seller.
10. Buyer, seller, admin, and logistics dashboards and notifications are checked for expected updates.

This is one of the strongest repo-backed indicators that Swapaholic is designed around an end-to-end marketplace operations workflow rather than only isolated UI pages.

## Repository Snapshot

| Area | Verified Count |
| --- | ---: |
| Backend route modules | 22 |
| Backend controllers | 27 |
| Mongoose models | 17 |
| Frontend `page.tsx` routes | 71 |

### Important directories

```text
swapaholic/
|-- backend/
|   |-- src/
|   |   |-- config/
|   |   |-- controllers/
|   |   |-- middleware/
|   |   |-- models/
|   |   |-- routes/
|   |   |-- scripts/
|   |   |-- services/
|   |   `-- utils/
|   |-- tests/
|   |-- .env.example
|   `-- package.json
|-- swapaholic-frontend/
|   |-- src/
|   |   |-- api/
|   |   |-- app/
|   |   |-- components/
|   |   |-- features/
|   |   |-- hooks/
|   |   |-- lib/
|   |   |-- store/
|   |   |-- styles/
|   |   |-- types/
|   |   `-- utils/
|   |-- public/
|   |-- .env.example
|   `-- package.json
|-- deployment/
|   |-- docker-compose.prod.yml
|   `-- nginx.conf
|-- docs/
|   `-- DEPLOYMENT.md
|-- docker-compose.yml
`-- README.md
```

## Architecture Overview

```text
Browser
  |
  v
Next.js frontend (App Router, Redux Toolkit, TypeScript)
  |
  +--> REST requests to Express API
  +--> Socket.IO client for realtime events
  |
  v
Express backend
  |
  +--> Auth, validation, rate limiting, error handling
  +--> Route modules for products, bids, orders, payments, QC, logistics, messages, admin, and more
  +--> Cron-driven auction lifecycle handling
  |
  v
MongoDB via Mongoose
  |
  +--> Product, Bid, AutoBid, Order, Payment
  +--> User, Review, Notification, Delivery, SupportTicket
  +--> QC, reporting, messaging, and content models
  |
  +--> External services
       - Stripe
       - Gemini
       - Hugging Face
       - Nodemailer
       - Cloudinary-backed storage flow
```

## Tech Stack

### Frontend

- Next.js 16
- React 19
- TypeScript
- Redux Toolkit
- Tailwind CSS 4
- React Hook Form and Yup
- Recharts
- React Leaflet
- GSAP
- Stripe client libraries
- Socket.IO client

### Backend

- Node.js
- Express
- MongoDB with Mongoose
- Socket.IO
- JWT
- bcryptjs
- nodemailer
- node-cron
- multer
- winston
- Helmet
- express-rate-limit

### AI and Integrations

- Google Gemini
- Hugging Face Inference
- Stripe
- Cloudinary-backed upload flow

### DevOps and Deployment

- Docker and Docker Compose
- Vercel for the frontend deployment target
- Render for the backend deployment target

## Getting Started

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB local instance or MongoDB Atlas

### 1. Clone the repository

```bash
git clone https://github.com/dearNoob/swapaholic.git
cd swapaholic
```

### 2. Start the backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Backend development server:

```text
http://localhost:5000
```

### 3. Start the frontend

```bash
cd ../swapaholic-frontend
npm install
cp .env.example .env.local
npm run dev
```

Frontend development server:

```text
http://localhost:3000
```

## Environment Variables

### Backend

Source of truth:

```text
backend/.env.example
```

Important values include:

```env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000
MONGODB_URI=mongodb://localhost:27017/swapaholic_db
JWT_SECRET=change-me-to-a-random-32-character-secret
JWT_REFRESH_SECRET=change-me-to-a-different-random-32-character-secret
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-app-password
FILE_STORAGE_PROVIDER=local
LOG_LEVEL=info
```

### Frontend

Source of truth:

```text
swapaholic-frontend/.env.example
```

Typical local values:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Local Docker Setup

For a multi-service local environment, the repo includes a root-level `docker-compose.yml`.

```bash
docker-compose up --build
```

The local stack includes:

- `frontend` on port `3000`
- `backend` on port `5000`
- `mongo` on port `27017`
- `redis` on port `6379`

Redis is present in the local Compose stack, but this README does not treat it as a guaranteed production dependency or a fully documented active caching layer.

To stop the stack:

```bash
docker-compose down
```

## Testing and Verification

### Backend scripts

Verified in `backend/package.json`:

```bash
npm start
npm run dev
npm test
npm run smoke:dashboards
```

### Frontend scripts

Verified in `swapaholic-frontend/package.json`:

```bash
npm run dev
npm run build
npm start
npm run lint
```

### Notes

- The backend test suite uses Jest, Supertest, and MongoMemoryServer.
- The dashboard smoke script is a valuable operational verification path for multi-role workflows.
- This README does not claim that the full automated suite is currently passing in every environment.

### Health endpoint

`GET /health`

Example response shape from the backend:

```json
{
  "status": "API is running",
  "service": "swapaholic-backend",
  "environment": "development",
  "version": "1.0.0",
  "storageProvider": "local",
  "uptimeSeconds": 1234,
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

## Deployment Notes

Production-oriented deployment guidance already exists in:

- `docs/DEPLOYMENT.md`
- `deployment/docker-compose.prod.yml`

Current public deployment targets:

- Frontend: Vercel
- Backend: Render

If you deploy your own copy, make sure the frontend and backend environment variables reference each other correctly, especially:

- `FRONTEND_URL`
- `CORS_ALLOWED_ORIGINS`
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SOCKET_URL`

## Screenshots

TBD

Suggested future additions:

- Landing page
- Product detail page
- Seller dashboard
- Admin dashboard
- Logistics dashboard

## Closing Note

Swapaholic is best understood as a substantial capstone marketplace system with real operational depth already present in the codebase. It is suitable both as a portfolio project and as a foundation for continued product development.

No standalone open-source license file is currently included in this repository.
