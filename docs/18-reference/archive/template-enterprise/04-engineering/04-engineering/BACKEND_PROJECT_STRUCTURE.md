# 🏗️ BACKEND PROJECT STRUCTURE

> Backend directory structure and organization for Telepizza Platform

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Backend Architecture |
| Document | BACKEND_PROJECT_STRUCTURE.md |
| Version | 1.0 |
| Status | Active |
| Owner | Backend Team |
| Classification | Architecture Guide |

---

# Backend Directory Structure

```
backend/
├── api/
│   ├── src/
│   │   ├── main.ts                    # Application entry point
│   │   ├── app.ts                     # Express app configuration
│   │   │
│   │   ├── config/
│   │   │   ├── index.ts               # Config aggregator
│   │   │   ├── database.ts            # Database configuration
│   │   │   ├── redis.ts               # Redis configuration
│   │   │   ├── jwt.ts                 # JWT configuration
│   │   │   └── environment.ts         # Environment variables
│   │   │
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.types.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── local.strategy.ts
│   │   │   │   └── middleware/
│   │   │   │       └── auth.middleware.ts
│   │   │   │
│   │   │   ├── users/
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   ├── users.routes.ts
│   │   │   │   ├── users.types.ts
│   │   │   │   ├── repository/
│   │   │   │   │   └── users.repository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── user.schema.ts
│   │   │   │
│   │   │   ├── customers/
│   │   │   │   ├── customers.controller.ts
│   │   │   │   ├── customers.service.ts
│   │   │   │   ├── customers.routes.ts
│   │   │   │   ├── customers.types.ts
│   │   │   │   ├── repository/
│   │   │   │   │   └── customers.repository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── customer.schema.ts
│   │   │   │
│   │   │   ├── orders/
│   │   │   │   ├── orders.controller.ts
│   │   │   │   ├── orders.service.ts
│   │   │   │   ├── orders.routes.ts
│   │   │   │   ├── orders.types.ts
│   │   │   │   ├── repository/
│   │   │   │   │   └── orders.repository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── order.schema.ts
│   │   │   │
│   │   │   ├── inventory/
│   │   │   │   ├── inventory.controller.ts
│   │   │   │   ├── inventory.service.ts
│   │   │   │   ├── inventory.routes.ts
│   │   │   │   ├── inventory.types.ts
│   │   │   │   ├── repository/
│   │   │   │   │   └── inventory.repository.ts
│   │   │   │   └── schemas/
│   │   │   │       └── inventory.schema.ts
│   │   │   │
│   │   │   └── branches/
│   │   │       ├── branches.controller.ts
│   │   │       ├── branches.service.ts
│   │   │       ├── branches.routes.ts
│   │   │       ├── branches.types.ts
│   │   │       ├── repository/
│   │   │       │   └── branches.repository.ts
│   │   │       └── schemas/
│   │   │           └── branch.schema.ts
│   │   │
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   │   ├── auth.decorator.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   └── validate.decorator.ts
│   │   │   │
│   │   │   ├── filters/
│   │   │   │   ├── http-exception.filter.ts
│   │   │   │   └── validation.filter.ts
│   │   │   │
│   │   │   ├── guards/
│   │   │   │   ├── jwt.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   │
│   │   │   ├── middleware/
│   │   │   │   ├── logging.middleware.ts
│   │   │   │   ├── cors.middleware.ts
│   │   │   │   └── error.middleware.ts
│   │   │   │
│   │   │   ├── pipes/
│   │   │   │   └── validation.pipe.ts
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── logger.ts
│   │   │       ├── errors.ts
│   │   │       ├── validators.ts
│   │   │       └── helpers.ts
│   │   │
│   │   ├── database/
│   │   │   ├── prisma.ts             # Prisma client instance
│   │   │   ├── seeds/
│   │   │   │   ├── index.ts
│   │   │   │   ├── users.seed.ts
│   │   │   │   ├── branches.seed.ts
│   │   │   │   └── menu.seed.ts
│   │   │   └── migrations/           # Prisma migrations (auto-generated)
│   │   │
│   │   └── types/
│   │       ├── index.ts              # Type exports
│   │       ├── express.ts            # Express augmentation
│   │       ├── responses.ts          # Response types
│   │       └── pagination.ts         # Pagination types
│   │
│   ├── prisma/
│   │   ├── schema.prisma              # Prisma schema
│   │   └── migrations/                # Database migrations
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── auth.service.test.ts
│   │   │   ├── users.service.test.ts
│   │   │   └── orders.service.test.ts
│   │   │
│   │   ├── integration/
│   │   │   ├── auth.integration.test.ts
│   │   │   └── orders.integration.test.ts
│   │   │
│   │   └── fixtures/
│   │       ├── users.fixture.ts
│   │       └── orders.fixture.ts
│   │
│   ├── .env.example                  # Example environment variables
│   ├── .env.test                     # Test environment variables
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript configuration
│   ├── jest.config.js                # Jest configuration
│   ├── Dockerfile                    # Docker configuration
│   └── README.md                     # Backend documentation
│
├── auth/
│   └── README.md                      # Auth service documentation
│
├── database/
│   ├── schema/
│   │   ├── README.md
│   │   └── complete-schema.sql       # Full database schema
│   │
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_indexes.sql
│   │   └── README.md
│   │
│   ├── seeds/
│   │   ├── seed-data.sql
│   │   └── README.md
│   │
│   └── procedures/
│       └── functions.sql
│
├── integrations/
│   ├── payment-gateway/
│   │   └── README.md
│   │
│   ├── sms-provider/
│   │   └── README.md
│   │
│   └── email-service/
│       └── README.md
│
├── notifications/
│   └── README.md
│
├── payments/
│   └── README.md
│
├── storage/
│   └── README.md
│
├── websocket/
│   └── README.md
│
├── ai-gateway/
│   └── README.md
│
└── jobs/
    └── README.md
```

---

# Module Structure Details

## Auth Module Structure

```
auth/
├── auth.controller.ts
├── auth.service.ts
├── auth.routes.ts
├── auth.types.ts
├── strategies/
│   ├── jwt.strategy.ts
│   ├── local.strategy.ts
│   └── oauth.strategy.ts
├── guards/
│   ├── jwt.guard.ts
│   └── local.guard.ts
├── decorators/
│   └── auth.decorator.ts
└── middleware/
    └── auth.middleware.ts
```

## Service Structure

```typescript
// auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async login(email: string, password: string) {
    // Implementation
  }

  async validateUser(id: string) {
    // Implementation
  }

  async refresh(token: string) {
    // Implementation
  }
}
```

## Controller Structure

```typescript
// auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() credentials) {
    // Implementation
  }

  @Post('register')
  async register(@Body() userData) {
    // Implementation
  }

  @Post('refresh')
  async refresh(@Body() refreshToken) {
    // Implementation
  }
}
```

---

# File Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Controllers | `{feature}.controller.ts` | `auth.controller.ts` |
| Services | `{feature}.service.ts` | `auth.service.ts` |
| Routes | `{feature}.routes.ts` | `auth.routes.ts` |
| Repositories | `{feature}.repository.ts` | `users.repository.ts` |
| Types | `{feature}.types.ts` | `auth.types.ts` |
| Schemas | `{feature}.schema.ts` | `user.schema.ts` |
| Tests | `{feature}.test.ts` | `auth.service.test.ts` |
| Config | `{service}.ts` | `database.ts` |

---

# Module Organization Principles

## 1. Feature-Based Structure
- Each feature is self-contained
- Related files grouped together
- Easy to locate functionality

## 2. Separation of Concerns
- Controllers: Request handling
- Services: Business logic
- Repositories: Data access
- Types: Type definitions

## 3. Shared Code
- Common utilities in `common/`
- Reusable middleware in `common/middleware/`
- Shared types in `types/`

## 4. Testing
- Tests co-located with source
- Unit tests for services
- Integration tests for API endpoints
- Fixtures for test data

---

# Import Path Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@config/*": ["src/config/*"],
      "@modules/*": ["src/modules/*"],
      "@common/*": ["src/common/*"],
      "@database/*": ["src/database/*"],
      "@types/*": ["src/types/*"]
    }
  }
}
```

Usage:
```typescript
import { AuthService } from '@modules/auth/auth.service';
import { logger } from '@common/utils/logger';
import { AppConfig } from '@config';
```

---

# Creating a New Module

## Step-by-Step Guide

1. Create module directory
```bash
mkdir -p src/modules/feature_name
```

2. Create required files
```bash
cd src/modules/feature_name
touch feature_name.controller.ts
touch feature_name.service.ts
touch feature_name.routes.ts
touch feature_name.types.ts
mkdir repository schemas
touch repository/feature_name.repository.ts
touch schemas/feature_name.schema.ts
```

3. Create controller
```typescript
// feature_name.controller.ts
import { Controller, Get, Post, Body } from '@nestjs/common';
import { FeatureService } from './feature_name.service';

@Controller('api/feature')
export class FeatureController {
  constructor(private service: FeatureService) {}

  @Get()
  async getAll() {
    return this.service.getAll();
  }

  @Post()
  async create(@Body() dto) {
    return this.service.create(dto);
  }
}
```

4. Create service
```typescript
// feature_name.service.ts
import { Injectable } from '@nestjs/common';
import { FeatureRepository } from './repository/feature_name.repository';

@Injectable()
export class FeatureService {
  constructor(private repository: FeatureRepository) {}

  async getAll() {
    return this.repository.findAll();
  }

  async create(data) {
    return this.repository.create(data);
  }
}
```

5. Register in app.module.ts
```typescript
import { FeatureController } from '@modules/feature/feature.controller';
import { FeatureService } from '@modules/feature/feature.service';

@Module({
  controllers: [FeatureController],
  providers: [FeatureService],
})
export class AppModule {}
```

---

# Best Practices

✅ **Do:**
- Keep modules focused and single-responsibility
- Use dependency injection
- Create clear type definitions
- Write unit tests
- Document complex logic
- Use consistent naming conventions
- Organize imports logically

❌ **Don't:**
- Mix concerns in single file
- Use any types
- Skip error handling
- Create deeply nested structures
- Import across module boundaries
- Put business logic in controllers

---

# Environment Files

## .env.example

```env
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/telepizza

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRY=24h

# Logging
LOG_LEVEL=debug
```

---

# Package.json Scripts

```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "db:migrate": "prisma migrate dev",
    "db:seed": "prisma db seed",
    "db:reset": "prisma migrate reset"
  }
}
```

---

# Next Steps

1. Create initial backend structure
2. Set up Prisma schema
3. Implement Auth module
4. Implement Users module
5. Set up database migrations

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
