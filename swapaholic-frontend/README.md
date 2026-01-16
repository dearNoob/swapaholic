# Swapaholic Frontend

Next.js-based frontend for the Swapaholic second-hand marketplace platform.

## Features

- **Authentication**: Login, Register, OAuth (Google, Facebook)
- **Buyer Features**: Product browsing, real-time bidding, escrow payments
- **Seller Features**: Product listing creation, dashboard, sales management
- **Real-time Updates**: Socket.IO integration for live bidding
- **State Management**: Redux Toolkit
- **Styling**: Tailwind CSS

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Backend API running on `http://localhost:5000`

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Update .env.local with your configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

### Development

```bash
# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
# Create production build
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── api/           # API client functions
├── app/           # Next.js app directory (pages, layouts)
├── components/    # Reusable UI components
├── features/      # Feature-specific components
│   ├── auth/      # Authentication
│   ├── buyer/     # Buyer features
│   ├── seller/    # Seller features
│   └── dashboard/ # Role-based dashboards
├── hooks/         # Custom React hooks
├── store/         # Redux store and slices
└── utils/         # Utility functions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **State**: Redux Toolkit
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Yup
- **Notifications**: React Toastify
- **Real-time**: Socket.IO Client

## Available Routes

- `/` - Home/Landing
- `/login` - Login page
- `/register` - Registration
- `/dashboard` - Role-based dashboard
- `/products` - Product listing
- `/products/[id]` - Product details with bidding
- `/payment/[id]` - Escrow payment
- `/seller/dashboard` - Seller dashboard
- `/seller/create-listing` - Create new listing

## Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## License

MIT
