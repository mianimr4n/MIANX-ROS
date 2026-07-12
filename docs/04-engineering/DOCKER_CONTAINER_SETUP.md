# 🐳 DOCKER & CONTAINER SETUP GUIDE

> Complete Docker configuration for Telepizza Platform development and deployment

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Document | DOCKER_CONTAINER_SETUP.md |
| Version | 1.0 |
| Status | Active |
| Owner | DevOps Team |
| Classification | Infrastructure Guide |

---

# Table of Contents

1. [Overview](#overview)
2. [Docker Compose Setup](#docker-compose-setup)
3. [Backend Dockerfile](#backend-dockerfile)
4. [Frontend Dockerfile](#frontend-dockerfile)
5. [Development Stack](#development-stack)
6. [Production Setup](#production-setup)
7. [Common Commands](#common-commands)
8. [Troubleshooting](#troubleshooting)

---

# Overview

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Network          │
├─────────────────────────────────────────┤
│  API Container   │  Frontend Container  │
│   (Node.js)      │   (Node.js/Next.js)  │
│   Port: 3000     │   Port: 3001         │
├─────────────────────────────────────────┤
│  PostgreSQL Container  │  Redis Cache   │
│  Port: 5432            │  Port: 6379    │
├─────────────────────────────────────────┤
│  Nginx Reverse Proxy                    │
│  Port: 80, 443                          │
└─────────────────────────────────────────┘
```

## Container Images

| Service | Image | Version | Port |
|---------|-------|---------|------|
| PostgreSQL | postgres | 16-alpine | 5432 |
| Redis | redis | 7-alpine | 6379 |
| API | node | 20-alpine | 3000 |
| Frontend | node | 20-alpine | 3001 |
| Nginx | nginx | alpine | 80, 443 |

---

# Docker Compose Setup

## Root Level: docker-compose.yml

```yaml
version: '3.8'

services:
  # Database Service
  postgres:
    image: postgres:16-alpine
    container_name: telepizza_postgres
    environment:
      POSTGRES_DB: ${DB_NAME:-telepizza_dev}
      POSTGRES_USER: ${DB_USER:-telepizza}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password}
      POSTGRES_INITDB_ARGS: "--encoding=UTF8"
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init:/docker-entrypoint-initdb.d
    networks:
      - telepizza_network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-telepizza}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Redis Cache Service
  redis:
    image: redis:7-alpine
    container_name: telepizza_redis
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis_pass}
    ports:
      - "${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
    networks:
      - telepizza_network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  # Backend API Service
  api:
    build:
      context: ./backend/api
      dockerfile: Dockerfile
      target: development
    container_name: telepizza_api
    environment:
      NODE_ENV: development
      PORT: 3000
      DATABASE_URL: postgresql://${DB_USER:-telepizza}:${DB_PASSWORD:-dev_password}@postgres:5432/${DB_NAME:-telepizza_dev}
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis_pass}@redis:6379
      JWT_SECRET: ${JWT_SECRET:-your-jwt-secret-key}
      LOG_LEVEL: ${LOG_LEVEL:-debug}
    ports:
      - "3000:3000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend/api:/app
      - /app/node_modules
    networks:
      - telepizza_network
    command: pnpm dev
    restart: unless-stopped

  # Frontend Service
  frontend:
    build:
      context: ./apps/website
      dockerfile: Dockerfile
      target: development
    container_name: telepizza_frontend
    environment:
      NODE_ENV: development
      NEXT_PUBLIC_API_URL: http://localhost:3000
      NEXT_PUBLIC_APP_NAME: Telepizza Platform
    ports:
      - "3001:3001"
    depends_on:
      - api
    volumes:
      - ./apps/website:/app
      - /app/node_modules
      - /app/.next
    networks:
      - telepizza_network
    command: pnpm dev
    restart: unless-stopped

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: telepizza_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./docker/nginx/conf.d:/etc/nginx/conf.d:ro
      - ./docker/nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
      - frontend
    networks:
      - telepizza_network
    restart: unless-stopped

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

networks:
  telepizza_network:
    driver: bridge
```

---

# Backend Dockerfile

## Multi-Stage Production Dockerfile

Create `backend/api/Dockerfile`:

```dockerfile
# ─────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────
FROM node:20-alpine AS dependencies

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# ─────────────────────────────────────────
# Stage 2: Development
# ─────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

# Copy dependencies from stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Expose development port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start development server
CMD ["pnpm", "dev"]

# ─────────────────────────────────────────
# Stage 3: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from stage 1
COPY --from=dependencies /app/node_modules ./node_modules

# Copy source code
COPY . .

# Build application
RUN pnpm build

# ─────────────────────────────────────────
# Stage 4: Production Runtime
# ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node healthcheck.js || exit 1

# Start production server
CMD ["node", "dist/main.js"]
```

---

# Frontend Dockerfile

## Next.js Production Dockerfile

Create `apps/website/Dockerfile`:

```dockerfile
# ─────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────
FROM node:20-alpine AS dependencies

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# ─────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Build Next.js application
RUN pnpm build

# ─────────────────────────────────────────
# Stage 3: Development
# ─────────────────────────────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3001

CMD ["pnpm", "dev"]

# ─────────────────────────────────────────
# Stage 4: Production Runtime
# ─────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile --prod

# Copy built files from builder
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["pnpm", "start"]
```

---

# Development Stack

## Complete docker-compose.yml for Development

```yaml
# Already detailed above - use root docker-compose.yml
```

## Environment File: .env

```env
# Database
DB_NAME=telepizza_dev
DB_USER=telepizza
DB_PASSWORD=dev_password
DB_PORT=5432

# Redis
REDIS_PASSWORD=redis_pass
REDIS_PORT=6379

# API
JWT_SECRET=dev-secret-key-change-in-production
LOG_LEVEL=debug

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000

# Environment
ENVIRONMENT=development
```

---

# Production Setup

## Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
    networks:
      - telepizza_prod_network
    restart: always

  api:
    image: telepizza/api:latest
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - postgres
    networks:
      - telepizza_prod_network
    restart: always

  frontend:
    image: telepizza/frontend:latest
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
    depends_on:
      - api
    networks:
      - telepizza_prod_network
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - api
      - frontend
    networks:
      - telepizza_prod_network
    restart: always

volumes:
  postgres_prod_data:

networks:
  telepizza_prod_network:
```

---

# Common Commands

## Build Images

```bash
# Build all images
docker compose build

# Build specific service
docker compose build api

# Build without cache
docker compose build --no-cache
```

## Run Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d postgres

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f api
```

## Stop Services

```bash
# Stop all services
docker compose down

# Stop specific service
docker compose stop api

# Remove containers and volumes
docker compose down -v
```

## Debugging

```bash
# Enter container shell
docker compose exec api sh

# Run command in container
docker compose exec api pnpm test

# View service status
docker compose ps

# Inspect network
docker network ls
docker network inspect telepizza_network
```

---

# Troubleshooting

### Issue: Port already in use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in docker-compose.yml
```

### Issue: Database connection refused

```bash
# Check PostgreSQL health
docker compose exec postgres pg_isready -U telepizza

# Restart PostgreSQL
docker compose restart postgres
```

### Issue: Out of memory

```bash
# Increase Docker memory limit in Docker Desktop
# Settings → Resources → Memory: 8GB

# Clear unused images/volumes
docker system prune -a
```

### Issue: Permission denied

```bash
# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
