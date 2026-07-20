# 🖥️ DEVELOPMENT ENVIRONMENT SETUP

> Step-by-step guide to set up local development environment for Telepizza Platform

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Document | DEVELOPMENT_ENVIRONMENT_SETUP.md |
| Version | 1.0 |
| Status | Active |
| Owner | Development Team |
| Classification | Developer Guide |

---

# Table of Contents

1. [System Requirements](#system-requirements)
2. [Software Installation](#software-installation)
3. [Repository Setup](#repository-setup)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Docker Setup](#docker-setup)
7. [Running the Project](#running-the-project)
8. [Troubleshooting](#troubleshooting)

---

# System Requirements

## Minimum Specifications

- **OS:** Windows 10+, macOS 11+, Ubuntu 20.04+
- **RAM:** 8GB minimum, 16GB recommended
- **Disk Space:** 50GB available
- **CPU:** 4 cores minimum, 8 cores recommended

## Supported Platforms

- ✅ Windows 11
- ✅ Windows 10 (Build 19041+)
- ✅ macOS 11 (Big Sur) and later
- ✅ Ubuntu 20.04 LTS
- ✅ Ubuntu 22.04 LTS
- ✅ Debian 11+

---

# Software Installation

## Required Tools

### 1. Node.js & npm

**Version:** v18.0.0 or higher (v20+ recommended)

#### Windows
```powershell
# Using Chocolatey
choco install nodejs

# Or download from https://nodejs.org/
```

#### macOS
```bash
# Using Homebrew
brew install node
```

#### Linux
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install nodejs npm

# Or use NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify Installation:**
```bash
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

### 2. PNPM (Package Manager)

**Version:** v10.0.0 or higher

```bash
npm install -g pnpm@10

# Verify
pnpm --version
```

### 3. Git

**Version:** 2.40.0 or higher

#### Windows
```powershell
choco install git
```

#### macOS
```bash
brew install git
```

#### Linux
```bash
sudo apt-get install git
```

**Verify Installation:**
```bash
git --version
```

### 4. Docker & Docker Compose

**Version:** Docker Engine 20.10+, Docker Compose v2.0+

#### Windows (Windows Subsystem for Linux 2)

1. Enable WSL 2
2. Download Docker Desktop: https://www.docker.com/products/docker-desktop
3. Install and start Docker Desktop

#### macOS
```bash
brew install docker docker-compose
# Or download Docker Desktop from https://www.docker.com/products/docker-desktop
```

#### Linux
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

**Verify Installation:**
```bash
docker --version
docker compose version
```

### 5. PostgreSQL Client (Optional)

For direct database management:

#### Windows
```powershell
choco install postgresql
```

#### macOS
```bash
brew install postgresql
```

#### Linux
```bash
sudo apt-get install postgresql-client
```

### 6. Code Editor (Recommended)

**Visual Studio Code** - https://code.visualstudio.com/

**Recommended Extensions:**
- ESLint
- Prettier
- TypeScript Vue Plugin
- Docker
- REST Client
- Thunder Client
- Git Graph
- Copilot (optional)

---

# Repository Setup

## 1. Clone Repository

```bash
cd ~/projects  # Or your preferred location

git clone https://github.com/mianimr4n/Telepizza-Platform.git

cd Telepizza-Platform
```

## 2. Verify Branch

```bash
git branch -a

# Should show: * main (or development branch)
```

## 3. Install Dependencies

```bash
# Install root dependencies
pnpm install

# This will install all workspace dependencies
# (backend, frontend, mobile apps)
```

---

# Environment Configuration

## 1. Create Environment Files

### Root Level (.env)

```bash
cp .env.example .env
```

If no `.env.example` exists, create `.env`:

```env
# Project Information
PROJECT_NAME=Telepizza Platform
ENVIRONMENT=development

# Node
NODE_ENV=development
NODE_VERSION=20

# PNPM
PNPM_HOME=/path/to/.pnpm
```

### Backend Environment

```bash
cd backend/api
cp .env.example .env.local
```

Create `backend/api/.env.local`:

```env
# API Configuration
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/telepizza_dev
DATABASE_POOL_SIZE=20

# Authentication
JWT_SECRET=your-jwt-secret-key-change-in-production
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Logging
LOG_LEVEL=debug

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:3001

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# AI Gateway
AI_GATEWAY_URL=http://localhost:4000
```

### Frontend Environment

```bash
cd apps/website
cp .env.example .env.local
```

Create `apps/website/.env.local`:

```env
# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Telepizza Platform
NEXT_PUBLIC_ENVIRONMENT=development

# Analytics (Optional)
NEXT_PUBLIC_GA_ID=
```

---

# Database Setup

## 1. Using PostgreSQL Locally

### Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install with pgAdmin
3. Create database:

```sql
CREATE DATABASE telepizza_dev;
CREATE USER telepizza WITH PASSWORD 'dev_password';
ALTER ROLE telepizza WITH CREATEDB;
GRANT ALL PRIVILEGES ON DATABASE telepizza_dev TO telepizza;
```

### macOS / Linux

```bash
# Create database and user
createdb telepizza_dev

# Create user
psql -d telepizza_dev -c "CREATE USER telepizza WITH PASSWORD 'dev_password';"

# Grant privileges
psql -d telepizza_dev -c "ALTER ROLE telepizza WITH CREATEDB;"
psql -d telepizza_dev -c "GRANT ALL PRIVILEGES ON DATABASE telepizza_dev TO telepizza;"
```

## 2. Using Docker (Recommended)

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: telepizza_postgres
    environment:
      POSTGRES_DB: telepizza_dev
      POSTGRES_USER: telepizza
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U telepizza"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: telepizza_redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Start services:

```bash
docker compose up -d

# Verify
docker compose ps
```

---

# Docker Setup

## 1. Backend Docker Setup

Create `backend/api/Dockerfile`:

```dockerfile
# Development Stage
FROM node:20-alpine AS development

WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start development
CMD ["pnpm", "dev"]
```

## 2. Build Backend Image

```bash
cd backend/api
docker build -t telepizza-api:dev .
```

## 3. Run Backend Container

```bash
docker run -d \
  --name telepizza-api \
  -p 3000:3000 \
  --env-file .env.local \
  --network host \
  telepizza-api:dev
```

---

# Running the Project

## Local Development

### Option 1: Run All Services Locally

```bash
# Terminal 1: Start Backend
cd backend/api
pnpm install
pnpm dev

# Terminal 2: Start Frontend
cd apps/website
pnpm install
pnpm dev

# Terminal 3: Start Mobile (if needed)
cd apps/mobile-app
pnpm install
pnpm dev
```

### Option 2: Run with Docker Compose

```bash
# All services including database
docker compose up -d

# View logs
docker compose logs -f api

# Stop services
docker compose down
```

## Development Scripts

### Root Level

```bash
# Install all dependencies
pnpm install

# Run all development servers
pnpm dev

# Build all projects
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Format code
pnpm format
```

### Backend

```bash
cd backend/api

# Development mode with hot reload
pnpm dev

# Production build
pnpm build

# Run tests
pnpm test

# Run specific test file
pnpm test -- order.test.ts
```

### Frontend

```bash
cd apps/website

# Development server
pnpm dev

# Production build
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
```

---

# Troubleshooting

## Common Issues

### Issue: PNPM not found

```bash
# Solution: Install globally
npm install -g pnpm@10
```

### Issue: PostgreSQL connection refused

```bash
# Solution: Check if PostgreSQL is running
psql -U telepizza -d telepizza_dev -c "SELECT 1;"

# Or with Docker
docker ps | grep postgres
```

### Issue: Port 3000 already in use

```bash
# Windows: Find and kill process
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Issue: Docker daemon not running

```bash
# Windows/macOS: Start Docker Desktop

# Linux: Start Docker service
sudo systemctl start docker
```

### Issue: Module not found errors

```bash
# Clear node_modules and reinstall
pnpm install --force

# Clear cache
pnpm store prune
```

---

# Performance Optimization

## Recommended VSCode Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "search.exclude": {
    "**/node_modules": true,
    "**/.pnpm": true
  }
}
```

## Git Configuration

```bash
# Configure Git
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Set up SSH keys (recommended for GitHub)
ssh-keygen -t ed25519 -C "your.email@example.com"

# Add to GitHub: https://github.com/settings/keys
```

---

# Next Steps

1. ✅ Install all required software
2. ✅ Clone repository
3. ✅ Install dependencies
4. ✅ Set up environment files
5. ✅ Start development servers
6. ✅ Verify all services running
7. Read [CODING_STANDARDS.md](../03-architecture/CODING_STANDARDS.md)
8. Review [GIT_STRATEGY.md](../03-architecture/GIT_STRATEGY.md)

---

# Getting Help

- 🐛 Issues: GitHub Issues tab
- 💬 Discussions: GitHub Discussions
- 📖 Documentation: `/docs` folder
- 🔗 Architecture: [SYSTEM_ARCHITECTURE.md](../03-architecture/SYSTEM_ARCHITECTURE.md)

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026  
**Next Review:** As needed
