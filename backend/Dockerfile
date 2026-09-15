# Multi-stage production Dockerfile for RAMGuard Node.js Backend
FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install dependencies needed for native builds or health checks
RUN apk add --no-cache curl

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/

# Ensure proper permissions for the built-in non-root node user
RUN chown -R node:node /usr/src/app

USER node

EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

# Run with --expose-gc enabled to allow memory reclamation testing
CMD ["node", "--expose-gc", "src/server.js"]
