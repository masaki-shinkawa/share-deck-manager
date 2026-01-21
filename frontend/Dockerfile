# Development Dockerfile for Next.js Frontend
FROM node:alpine

# Set working directory
WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy application code (will be overridden by volume mount in development)
COPY . .

# Expose port
EXPOSE 3000

# Start Next.js development server with hot reload
CMD ["npm", "run", "dev"]
