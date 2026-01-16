# Copilot Instructions for Swapaholic Codebase

## Project Overview
Swapaholic is a second-hand marketplace platform with the following components:

1. **Backend**: Node.js application using Express and MongoDB (via Mongoose ORM).
   - Handles authentication, product management, bidding, payments, and delivery tracking.
   - Key directories: `src/models/`, `src/routes/`, `src/controllers/`, `src/middleware/`.
2. **Frontend**: Next.js application with TypeScript and Tailwind CSS.
   - Provides user interfaces for buyers, sellers, and admins.
   - Key directories: `src/components/`, `src/features/`, `src/store/`.

## Architecture Highlights
- **Backend**:
  - RESTful API with routes organized by feature (e.g., `authRoutes.js`, `productRoutes.js`).
  - MongoDB models for core entities: `User`, `Product`, `Bid`, `Order`, `Payment`, etc.
  - Middleware for authentication (`auth.js`) and error handling (`errorHandler.js`).
  - Utility functions for logging and database seeding.
- **Frontend**:
  - Next.js App Router structure with role-based dashboards.
  - State management via Redux Toolkit.
  - Real-time updates using Socket.IO.

## Developer Workflows

### Backend
- **Setup**:
  ```bash
  cd backend
  npm install
  cp .env.example .env
  ```
- **Run Development Server**:
  ```bash
  npm run dev
  ```
- **Run Tests**:
  ```bash
  npm test
  ```
- **Seed Database**:
  ```bash
  npm run seed
  ```
- **Production Build**:
  ```bash
  npm start
  ```

### Frontend
- **Setup**:
  ```bash
  cd swapaholic-frontend
  npm install
  cp .env.example .env.local
  ```
- **Run Development Server**:
  ```bash
  npm run dev
  ```
- **Build for Production**:
  ```bash
  npm run build
  npm start
  ```

## Project-Specific Conventions
- **Backend**:
  - Use Mongoose pre-save hooks for tasks like password hashing.
  - Define indexes for MongoDB models to optimize queries (e.g., geospatial indexes for `Product` locations).
  - Follow the `src/routes/` -> `src/controllers/` -> `src/models/` pattern for API development.
- **Frontend**:
  - Use `src/features/` for feature-specific components (e.g., `auth`, `buyer`, `seller`).
  - Store API base URLs in `NEXT_PUBLIC_API_BASE_URL`.
  - Use `React Hook Form` and `Yup` for form validation.

## Integration Points
- **Backend**:
  - MongoDB: Connection configured in `src/config/mongodb.js`.
  - Stripe: Payment processing via `Payment` model and Stripe SDK.
  - Redis: Caching and session management.
- **Frontend**:
  - API: Communicates with the backend via `NEXT_PUBLIC_API_BASE_URL`.
  - Socket.IO: Real-time updates for bidding and notifications.

## Key Files and Directories
- **Backend**:
  - `src/models/`: MongoDB models (e.g., `User.js`, `Product.js`).
  - `src/routes/`: API routes (e.g., `authRoutes.js`, `productRoutes.js`).
  - `src/controllers/`: Business logic.
  - `src/middleware/`: Middleware for authentication and error handling.
- **Frontend**:
  - `src/components/`: Reusable UI components.
  - `src/features/`: Feature-specific components.
  - `src/store/`: Redux slices and store configuration.

## Examples
- **Backend Route Example**:
  ```javascript
  // src/routes/productRoutes.js
  const express = require('express');
  const { getProducts, createProduct } = require('../controllers/productController');
  const router = express.Router();

  router.get('/', getProducts);
  router.post('/', createProduct);

  module.exports = router;
  ```
- **Frontend Component Example**:
  ```tsx
  // src/components/Button.tsx
  import React from 'react';

  interface ButtonProps {
    label: string;
    onClick: () => void;
  }

  const Button: React.FC<ButtonProps> = ({ label, onClick }) => (
    <button className="bg-blue-500 text-white px-4 py-2" onClick={onClick}>
      {label}
    </button>
  );

  export default Button;
  ```

## Notes
- Always update `.env` or `.env.local` files with the correct environment variables.
- Use `npm run lint` to ensure code quality.
- For production, ensure secure values for secrets (e.g., `JWT_SECRET`, `STRIPE_SECRET_KEY`).