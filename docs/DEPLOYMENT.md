# Deployment Guide

This project is designed to run with:

- Frontend on Vercel
- Backend API on Render
- MongoDB on Atlas or another managed MongoDB provider

## Deploy Order

1. Deploy the backend on Render.
2. Set backend environment variables.
3. Copy the live backend URL into the frontend environment variables on Vercel.
4. Deploy the frontend on Vercel.
5. Set the backend `FRONTEND_URL` and `CORS_ALLOWED_ORIGINS` to the final Vercel domain and any custom domain.
6. Re-deploy both services after environment changes.

## Render Backend

Set these environment variables on the Render service:

```env
NODE_ENV=production
PORT=10000
MONGODB_URI=your-mongodb-connection-string
JWT_SECRET=your-random-32-character-secret
JWT_REFRESH_SECRET=your-second-random-32-character-secret
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-frontend-domain.vercel.app
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app,https://www.yourdomain.com
STRIPE_SECRET_KEY=your-live-or-test-stripe-secret
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
FILE_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
LOG_LEVEL=info
```

Notes:

- `FRONTEND_URL` is used for emails, payment redirects, and CORS.
- `CORS_ALLOWED_ORIGINS` should include every browser origin that is allowed to call the backend.
- Use HTTPS URLs only in production.
- Render assigns `PORT` automatically for many service types. Keep the app flexible by not hardcoding the port in the Render dashboard.
- `FILE_STORAGE_PROVIDER=cloudinary` moves uploaded media off the Render filesystem.

## Vercel Frontend

Set these environment variables on the Vercel project:

```env
NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://your-backend.onrender.com
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

Notes:

- `NEXT_PUBLIC_API_BASE_URL` must end with `/api`.
- `NEXT_PUBLIC_SOCKET_URL` must point to the backend origin without `/api`.
- If you use a custom frontend domain, keep both the Vercel default domain and the custom domain in backend CORS until the cutover is complete.

## Custom Domain Checklist

Frontend custom domain:

- Attach the domain to the correct Vercel project.
- Confirm DNS records point to Vercel.
- Confirm the Vercel deployment selected for the domain is this Next.js app.

Backend custom domain, if used:

- Attach the domain to the correct Render service.
- Update `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_SOCKET_URL` after the backend custom domain is live.

## Post-Deploy Verification

Check these in order:

1. Backend health:
   - `GET https://your-backend.onrender.com/health`
   - Expected fields include `status`, `service`, `environment`, `version`, and `uptimeSeconds`
2. Frontend loads:
   - `https://your-frontend-domain.vercel.app`
3. Auth:
   - register
   - login
   - refresh token flow
4. Real-time:
   - seller dashboard receives socket updates
5. Buyer flow:
   - place bid
   - confirm won auction
   - complete payment
6. Admin flow:
   - verification panel loads images
   - payout screen loads product thumbnails
7. Logistics flow:
   - dashboard loads assigned tasks

## Production Risk To Address Next

User-uploaded files should not rely on the backend filesystem in production.

This repo now supports Cloudinary-backed uploads through `FILE_STORAGE_PROVIDER=cloudinary`. If you keep `FILE_STORAGE_PROVIDER=local`, uploaded files remain on the backend filesystem and are not durable enough for an industry-standard deployment unless you attach persistent storage.

This affects at least:

- product images
- message attachments
- smoke-test sample files written under `/uploads`

## Recommended Release Gate

Before calling the deployment production-ready, make sure all of these are true:

- live frontend domain serves this Next.js app
- live backend health endpoint responds
- frontend and backend env variables match each other
- CORS only allows intended browser origins
- refresh cookies work over HTTPS
- uploads use durable storage or an attached persistent disk
