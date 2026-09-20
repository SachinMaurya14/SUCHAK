# ==============================================================================
# SUCHAK Enterprise HSE Platform — Production Containerfile
# Multi-Stage Build: Minimal Alpine footprint, Non-Root User, Hardened Security
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build & Compilation
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build prerequisites
RUN apk add --no-cache python3 make g++

# Copy dependency manifests
COPY package.json package-lock.json* ./

# Install full dependencies for compilation
RUN npm ci

# Copy source code and configurations
COPY . .

# Set production build environment
ENV NODE_ENV=production

# Compile client bundle and bundle server to dist/server.cjs
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Hardened Runtime Container
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

# Install dumb-init for clean PID 1 signal forwarding
RUN apk add --no-cache dumb-init

# Create non-root system group and user
RUN addgroup -S suchak && adduser -S suchak -G suchak

# Copy runtime dependency manifests
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled bundles from builder stage
COPY --from=builder /app/dist ./dist

# Ensure app directory permissions belong to non-root user
RUN chown -R suchak:suchak /app

# Switch to non-root user
USER suchak

# Container networking and runtime configuration
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check using lightweight HTTP probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/live || exit 1

# Launch production server via dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.cjs"]
