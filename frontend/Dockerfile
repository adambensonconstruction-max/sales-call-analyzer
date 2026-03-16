# Frontend Dockerfile for Sales Call Analyzer
# Multi-stage build with Nginx for production

# ============================================================================
# Stage 1: Build
# ============================================================================
FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build arguments for environment variables
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_URL

# Set environment variables for build
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_API_URL=$VITE_API_URL

# Build the application
RUN npm run build

# ============================================================================
# Stage 2: Production (Nginx)
# ============================================================================
FROM nginx:alpine as production

# Install curl for health checks
RUN apk add --no-cache curl

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create health check endpoint
RUN echo '{"status":"healthy","service":"frontend"}' > /usr/share/nginx/html/health

# Expose ports
EXPOSE 80 443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
