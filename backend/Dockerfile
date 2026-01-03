# Use official Bun image
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./
COPY backend/package.json ./backend/

# Install dependencies
WORKDIR /app/backend
RUN bun install --frozen-lockfile

# Copy source code
WORKDIR /app
COPY . .

# Build the application
WORKDIR /app/backend
RUN bun run build

# Production stage - use Node for native module compatibility
FROM node:20-alpine AS production

WORKDIR /app

# Copy built files and node_modules from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./

# Expose port
EXPOSE 3000

# Start with Node for native module compatibility (canvas, tesseract.js)
CMD ["node", "dist/main"]
