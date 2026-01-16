# Use official Node.js image as the base
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies (including only production dependencies)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy source code and build the Next.js app
COPY . .
RUN npm run build

# Production image, use a smaller node image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production

# Start the Next.js server
CMD ["npm", "run", "start"]
