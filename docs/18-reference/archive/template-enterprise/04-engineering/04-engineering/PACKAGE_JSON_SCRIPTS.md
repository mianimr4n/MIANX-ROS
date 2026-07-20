# 📦 INITIAL PACKAGE.JSON SCRIPTS

> Development scripts and commands for all Telepizza projects

---

# Root Level: package.json

```json
{
  "name": "telepizza-platform",
  "version": "1.0.0",
  "description": "Enterprise Restaurant Management Platform",
  "workspaces": [
    "backend/*",
    "apps/*"
  ],
  "scripts": {
    "dev": "pnpm -r --parallel run dev",
    "build": "pnpm -r run build",
    "start": "pnpm -r run start",
    "test": "pnpm -r run test",
    "test:watch": "pnpm -r run test:watch",
    "test:cov": "pnpm -r run test:cov",
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "format": "pnpm -r run format",
    "format:check": "pnpm -r run format:check",
    "type-check": "pnpm -r run type-check",
    "db:migrate": "cd backend/api && pnpm prisma migrate dev",
    "db:reset": "cd backend/api && pnpm prisma migrate reset",
    "db:seed": "cd backend/api && pnpm prisma db seed",
    "docker:build": "docker compose build",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down",
    "docker:logs": "docker compose logs -f"
  }
}
```

---

# Backend API: package.json

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write src/",
    "format:check": "prettier --check src/",
    "type-check": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:reset": "prisma migrate reset",
    "db:seed": "prisma db seed"
  }
}
```

---

# Frontend: package.json

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "type-check": "tsc --noEmit"
  }
}
```

---

# Mobile App: package.json

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "build:android": "eas build --platform android",
    "build:ios": "eas build --platform ios",
    "submit": "eas submit"
  }
}
```

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
