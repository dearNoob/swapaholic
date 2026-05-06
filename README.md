<div align="center">

<h1>🔄 Swapaholic</h1>

<p><strong>A Full-Stack P2P Marketplace & Service Exchange Platform</strong></p>

<p>
  <a href="#"><img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="#"><img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Socket.io-Real--Time-010101?style=for-the-badge&logo=socket.io" alt="Socket.io" /></a>
  <a href="#"><img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Tests-214%20Passing-brightgreen?style=for-the-badge&logo=jest&logoColor=white" alt="Tests" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
</p>

<p><em>An end-to-end peer-to-peer marketplace where users can buy, sell, and bid on products — and discover verified local service providers — all in one platform.</em></p>

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Database Models](#-database-models)
- [API Reference](#-api-reference)
- [User Roles](#-user-roles)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running with Docker](#-running-with-docker)
- [Running Tests](#-running-tests)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)

---

## 🌐 Overview

**Swapaholic** is a comprehensive **peer-to-peer (P2P) marketplace** built as a Capstone project. It enables users to list pre-owned products for direct sale or live auction, hire and offer local services, and complete the entire transaction lifecycle — from discovery to payment to delivery — within a single, unified platform.

The platform is designed with the Bangladeshi market in mind, supporting local mobile financial services (bKash, Rocket, Nagad) alongside international card payments via Stripe.

### What makes Swapaholic different?

| Feature | Description |
|---|---|
| 🤖 **AI-Powered Listings** | Google Gemini AI generates product descriptions & suggests fair prices |
| 🏷️ **Live Auction System** | Real-time bidding with auto-bid support and a 5% minimum increment rule |
| 🔍 **QC Verification** | Dedicated Quality Controllers verify product condition before listing goes live |
| 🗺️ **Geospatial Search** | Find nearby products and services using map-based discovery (Leaflet + MongoDB 2dsphere) |
| 💬 **Real-Time Messaging** | In-app Socket.io chat between buyers and sellers |
| 🔐 **Enterprise Security** | JWT auth, 2FA (TOTP), OTP via email, rate limiting, Helmet, input sanitization |

---

## 🚀 Live Demo

| Service | URL |
|---|---|
| 🌍 **Frontend** | Deployed on **Vercel** |
| ⚙️ **Backend API** | Deployed on **Render** |
| 📘 **API Health** | `GET /health` |

---

## ✨ Key Features

### 🛍️ Marketplace & Auction
- Browse, search, and filter products with full-text search
- Sell products via **fixed price** or **live auction**
- Real-time bidding with **auto-bid** and minimum 5% bid increment enforcement
- Auction scheduler via cron jobs — automatically closes ended auctions
- AI-suggested pricing from Google Gemini based on product images
- Product condition grading: Brand New → Like New → Excellent → Good → Fair

### 🧑‍🔧 Service Marketplace
- List and discover local services across 11 categories (Repair, Cleaning, Tech Support, Tutoring, etc.)
- Service provider scheduling with weekly availability calendar
- Provider ratings, reviews, and booking count tracking
- Service verification and certification system

### 🔐 Authentication & Security
- JWT-based access tokens + refresh token rotation
- Two-Factor Authentication (2FA) with TOTP (QR code based)
- OTP email verification for login, password reset, and phone verify
- Login history tracking with device fingerprinting
- Rate limiting: 1000 req/15min global, 30 req/15min on auth routes
- Helmet.js security headers, CORS with allowlist, input sanitization

### 👤 User & Role Management
- 9 distinct roles: `user`, `buyer`, `seller`, `quality_controller`, `delivery_person`, `admin`, `logistics_officer`, `verifier`, `delivery`
- KYC verification with NID document upload
- Seller onboarding flow with profile completion scoring
- Admin panel for user management, suspensions, and bans
- Follower/following social graph

### 💳 Payments
- **Stripe** card payments (international)
- **bKash / Rocket / Nagad / Bank** (local Bangladeshi MFS)
- Mock payment gateway for development/testing
- Stripe webhook integration for payment event handling
- Secure payment method storage with masked card details

### 📦 Orders & Logistics
- Full order lifecycle: placed → confirmed → shipped → delivered
- Dedicated logistics officer dashboard
- Delivery person assignment and tracking
- Shipping address book management

### 🔔 Notifications & Messaging
- Real-time push notifications via Socket.io
- In-app notification center with read/unread state
- Buyer-seller direct messaging with conversation threads
- Message blocking support

### 🛠️ Admin Panel
- Platform analytics dashboard (users, revenue, orders, products)
- Product & service moderation
- Dispute resolution management
- QC verification queue management
- Content management

### 🌟 Additional Features
- Wishlist management
- Product review & rating system (with buyer rating)
- Support ticket system
- User report & block system
- Recently viewed products
- Seller analytics dashboard
- Buyer order history dashboard
- Price prediction via AI model
- Responsive design with Tailwind CSS

---

## 🧰 Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 16** (React 19) | Full-stack React framework with App Router |
| **TypeScript 5** | Type safety across the codebase |
| **Tailwind CSS 4** | Utility-first styling |
| **Redux Toolkit** | Global state management |
| **Socket.io Client** | Real-time bidding & messaging |
| **Stripe.js** | Client-side payment UI |
| **React Leaflet** | Interactive maps |
| **GSAP** | Smooth animations |
| **TipTap** | Rich text editor for descriptions |
| **Recharts** | Analytics charts and graphs |
| **React Hook Form + Yup** | Form validation |
| **React Toastify** | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js + Express.js** | REST API server |
| **MongoDB + Mongoose** | Primary database with 2dsphere geospatial indexing |
| **Socket.io** | WebSocket real-time communication |
| **JWT** | Stateless authentication |
| **Bcrypt.js** | Password hashing |
| **Stripe** | Payment processing |
| **Nodemailer** | Transactional email (OTP, notifications) |
| **Google Gemini AI** | AI-generated descriptions & price suggestions |
| **Google Cloud Vision** | Image analysis for quality scoring |
| **HuggingFace Inference** | ML-based price prediction |
| **Node-Cron** | Scheduled auction closing jobs |
| **Helmet** | HTTP security headers |
| **express-rate-limit** | API rate limiting |
| **Winston** | Structured logging |
| **Multer** | File upload handling |

### DevOps & Testing
| Technology | Purpose |
|---|---|
| **Docker + Docker Compose** | Containerized local development |
| **Jest + Supertest** | Unit & integration testing (214 tests, 100% pass rate) |
| **MongoDB Memory Server** | In-memory DB for test isolation |
| **Nodemon** | Dev server auto-reload |
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment |
| **Cloudinary** | Production image storage |

---

## 🏛️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                   │
│              Next.js 16 + React 19 + TypeScript          │
│         Redux Store │ Socket.io Client │ Stripe.js       │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS / WSS
┌──────────────────────────▼──────────────────────────────┐
│                    BACKEND (Node.js)                     │
│  Express REST API  │  Socket.io Server  │  Cron Jobs     │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Middleware: CORS │ Helmet │ Rate Limit │ Auth    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │  REST Routes │  │  Socket.io │  │  Cron Scheduler  │  │
│  │  (22 modules)│  │  Handlers  │  │  (Auction close) │  │
│  └──────┬───────┘  └─────┬──────┘  └──────────────────┘  │
│         └────────────────┘                               │
└──────────────────────────┬──────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼──────┐  ┌────────▼──────┐  ┌────────▼──────┐
│   MongoDB     │  │  Cloudinary   │  │  External APIs │
│  (Mongoose)   │  │  (Images)     │  │  Stripe / Gemini│
│  17 Models    │  │               │  │  Vision / HF   │
└───────────────┘  └───────────────┘  └────────────────┘
```

---

## 📁 Project Structure

```
swapaholic/
├── backend/                     # Node.js + Express API
│   ├── src/
│   │   ├── index.js             # App entry, middleware, route mounting
│   │   ├── config/              # MongoDB connection, env validation
│   │   ├── controllers/         # Business logic (27 controllers)
│   │   ├── models/              # Mongoose schemas (17 models)
│   │   ├── routes/              # Route definitions (22 route files)
│   │   ├── middleware/          # Auth, error handling, validation
│   │   ├── services/            # External service integrations
│   │   └── utils/               # Logger, notifications, auction scheduler
│   ├── tests/                   # Jest test suites (214 tests)
│   ├── Dockerfile
│   └── package.json
│
├── swapaholic-frontend/         # Next.js 16 App Router frontend
│   ├── src/
│   │   ├── app/                 # Pages & layouts (29 routes)
│   │   │   ├── page.tsx         # Landing page
│   │   │   ├── admin/           # Admin dashboard
│   │   │   ├── seller/          # Seller dashboard
│   │   │   ├── buyer/           # Buyer dashboard
│   │   │   ├── products/        # Product detail & listing
│   │   │   ├── messages/        # Real-time chat
│   │   │   ├── payment/         # Checkout flow
│   │   │   └── ...              # 20+ more pages
│   │   ├── components/          # Reusable UI components (40+ components)
│   │   ├── features/            # Feature-specific components
│   │   ├── store/               # Redux slices & store
│   │   ├── hooks/               # Custom React hooks
│   │   ├── api/                 # Axios API layer
│   │   ├── types/               # TypeScript type definitions
│   │   └── utils/               # Helper functions
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml           # Multi-service local dev setup
└── README.md
```

---

## 🗄️ Database Models

| Model | Description |
|---|---|
| `User` | Core user with roles, KYC, 2FA, addresses, wishlist, payment methods |
| `Product` | Marketplace listing with auction fields, AI scores, geolocation |
| `Bid` | Individual bid records linked to product and bidder |
| `AutoBid` | Auto-bidding configuration per user per product |
| `Order` | Order lifecycle from purchase to delivery |
| `Payment` | Payment records across all gateways (Stripe, MFS) |
| `Service` | Service listings with availability, certifications, geolocation |
| `Conversation` | Messaging thread between two users |
| `Message` | Individual messages within a conversation |
| `Notification` | Platform notifications (bid won, order status, etc.) |
| `Delivery` | Delivery assignments and tracking |
| `Review` | Product and seller ratings |
| `QCVerification` | Quality control inspection records |
| `SupportTicket` | Customer support tickets |
| `Report` | User/product abuse reports |
| `BlockedUser` | User blocking relationships |
| `Content` | Admin-managed platform content |

---

## 📡 API Reference

The backend exposes **60+ REST API endpoints** across 22 route modules:

| Route Prefix | Module | Key Endpoints |
|---|---|---|
| `/api/auth` | Authentication | Register, Login, OTP, 2FA, Password Reset |
| `/api/users` | Users | Profile, Avatar, Follow, Settings |
| `/api/products` | Products | CRUD, Search, Filter, AI Description |
| `/api/bids` | Bidding | Place Bid, Auto-Bid, Bid History |
| `/api/orders` | Orders | Place Order, Track, Cancel |
| `/api/payments` | Payments | Stripe, MFS, Webhook |
| `/api/messages` | Messaging | Conversations, Send, Mark Read |
| `/api/notifications` | Notifications | List, Mark Read, Preferences |
| `/api/seller` | Seller | Dashboard, Analytics, Listings |
| `/api/admin` | Admin | User Mgmt, Disputes, Analytics |
| `/api/services` | Services | Browse, Book, Manage |
| `/api/qc` | Quality Control | Review Queue, Approve/Reject |
| `/api/logistics` | Logistics | Assignments, Tracking |
| `/api/delivery` | Delivery | Agent Dashboard, Status Updates |
| `/api/reviews` | Reviews | Submit, List, Rating Breakdown |
| `/api/support` | Support | Tickets, Replies |
| `/api/wishlist` | Wishlist | Add, Remove, List |
| `/api/reports` | Reports | Submit, Admin Review |
| `/api/shipping` | Shipping | Address Management |
| `/api/products/price` | AI Prediction | Price Recommendation |
| `/api/public` | Public | Unauthenticated endpoints |

**Health Check:**
```http
GET /health
```
```json
{
  "status": "API is running",
  "service": "swapaholic-backend",
  "environment": "production",
  "version": "1.0.0",
  "uptimeSeconds": 3600,
  "timestamp": "2026-05-06T12:00:00.000Z"
}
```

---

## 👥 User Roles

| Role | Description |
|---|---|
| `user` | Default role on registration |
| `buyer` | Can browse, bid, and purchase products |
| `seller` | Can list products and offer services |
| `quality_controller` | Verifies product condition before listing |
| `logistics_officer` | Manages shipments and logistics assignments |
| `delivery_person` | Handles last-mile delivery |
| `verifier` | Handles KYC and identity verification |
| `admin` | Full platform access and management |

---

## 🚦 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- **MongoDB** v6+ (local or Atlas)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/swapaholic.git
cd swapaholic
```

### 2. Set Up the Backend

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# → Fill in your values (see Environment Variables section below)

# Start the development server
npm run dev
```

The backend will start on **http://localhost:5000**

### 3. Set Up the Frontend

```bash
cd ../swapaholic-frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# → Set NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api

# Start the development server
npm run dev
```

The frontend will start on **http://localhost:3000**

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/swapaholic_db

# JWT
JWT_SECRET=your-super-secret-32-char-key
JWT_REFRESH_SECRET=your-refresh-secret-32-char-key
JWT_EXPIRES_IN=7d

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Nodemailer)
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Storage
FILE_STORAGE_PROVIDER=local
# For production (Cloudinary):
# FILE_STORAGE_PROVIDER=cloudinary
# CLOUDINARY_CLOUD_NAME=...
# CLOUDINARY_API_KEY=...
# CLOUDINARY_API_SECRET=...

# AI Services
GEMINI_API_KEY=your-google-gemini-key
GOOGLE_CLOUD_VISION_KEY=your-vision-api-key

# Logging
LOG_LEVEL=info
```

### Frontend (`swapaholic-frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🐳 Running with Docker

The easiest way to run the full stack locally is with Docker Compose:

```bash
# From the root of the project
docker-compose up --build
```

This starts **4 services** automatically:

| Service | Port | Description |
|---|---|---|
| `frontend` | 3000 | Next.js frontend |
| `backend` | 5000 | Express API + Socket.io |
| `mongo` | 27017 | MongoDB database |
| `redis` | 6379 | Redis (caching layer) |

To stop:
```bash
docker-compose down
```

To reset the database volume:
```bash
docker-compose down -v
```

---

## 🧪 Running Tests

```bash
cd backend

# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Run a specific test file
npm test -- authController
```

**Test Results:**
```
Test Suites: 11 passed, 11 total
Tests:       214 passed, 214 total
Pass Rate:   100% ✅
```

Tests use **MongoDB Memory Server** for full isolation — no external DB needed.

---

## 🚀 Deployment

### Frontend → Vercel

1. Push the repository to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set **Root Directory** to `swapaholic-frontend`
4. Add environment variables in the Vercel dashboard
5. Deploy

### Backend → Render

1. Create a new **Web Service** on [Render](https://render.com)
2. Connect your GitHub repository
3. Set **Root Directory** to `backend`
4. Set **Build Command**: `npm install`
5. Set **Start Command**: `npm start`
6. Add all environment variables in the Render dashboard
7. Deploy

> **Tip:** Set `NODE_ENV=production` and configure `FRONTEND_URL` to your Vercel domain.

---

## 🛡️ Security Highlights

- 🔒 **JWT + Refresh Tokens** — short-lived access tokens with secure rotation
- 📱 **Two-Factor Authentication** — TOTP via authenticator apps (QR code)
- 📧 **OTP Verification** — email-based OTP for login and password reset
- 🚦 **Rate Limiting** — 30 auth attempts / 1000 API calls per 15 minutes
- 🪖 **Helmet.js** — 15+ HTTP security headers configured
- 🧹 **Input Sanitization** — all incoming data sanitized before processing
- 🌐 **CORS Allowlist** — explicit origin validation with production enforcement
- 🔑 **Password Hashing** — bcryptjs with salt rounds = 10
- 📋 **Login History** — IP and device fingerprint tracking per user

---

## 📱 Application Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Hero, featured products, categories |
| Browse | `/browse` | Full marketplace with filters |
| Product Detail | `/products/[id]` | Listing, auction timer, bidding interface |
| Search | `/search` | Full-text product search |
| Seller Dashboard | `/seller` | My listings, analytics, earnings |
| Buyer Dashboard | `/buyer` | Orders, bids, wishlist |
| Messages | `/messages` | Real-time chat interface |
| Notifications | `/notifications` | Notification center |
| Admin | `/admin` | Platform management (admin only) |
| Logistics | `/logistics` | Logistics officer dashboard |
| Delivery | `/delivery` | Delivery agent dashboard |
| My Bids | `/my-bids` | Active and past bids |
| Orders | `/orders` | Order history and tracking |
| Profile | `/profile` | User profile and settings |
| Auth | `/auth`, `/login`, `/register` | Authentication flows |
| Verification | `/verification` | KYC verification |
| Wishlist | `/wishlist` | Saved products |
| Disputes | `/disputes` | Raise and manage disputes |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. Create a new branch: `git checkout -b feature/your-feature-name`
3. Make your changes and write tests if applicable
4. Commit your changes: `git commit -m "feat: add your feature"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a **Pull Request** against the `main` branch

### Commit Convention

| Prefix | Use case |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation update |
| `refactor:` | Code refactoring |
| `test:` | Adding or fixing tests |
| `chore:` | Build, config, tooling |

---

## 📄 License

This project is developed as a **Capstone academic project**. All rights reserved.

---

<div align="center">
  <p>Built with ❤️ as a Capstone Project</p>
  <p>
    <strong>Swapaholic</strong> — Buy, Sell, Swap. Smarter.
  </p>
</div>
