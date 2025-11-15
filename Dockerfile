FROM node:20-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies (including dev dependencies for build)
WORKDIR /app/backend
RUN npm ci

# Copy all files
WORKDIR /app
COPY . .

# Build the backend
WORKDIR /app/backend
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start:prod"]

