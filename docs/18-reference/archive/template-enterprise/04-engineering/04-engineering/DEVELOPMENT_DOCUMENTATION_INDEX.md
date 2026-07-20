# 📚 DEVELOPMENT DOCUMENTATION INDEX

> Complete reference guide for all development documentation

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Document | DEVELOPMENT_DOCUMENTATION_INDEX.md |
| Version | 1.0 |
| Status | Active |
| Owner | Development Team |
| Classification | Reference Guide |

---

# Quick Links by Role

## For New Developers
1. [Development Environment Setup](./DEVELOPMENT_ENVIRONMENT_SETUP.md) - Get started locally
2. [CODING_STANDARDS](../03-architecture/CODING_STANDARDS.md) - Code style & standards
3. [GIT_STRATEGY](../03-architecture/GIT_STRATEGY.md) - Git workflow
4. [Backend Project Structure](./BACKEND_PROJECT_STRUCTURE.md) - Backend organization

## For Backend Developers
1. [Backend Project Structure](./BACKEND_PROJECT_STRUCTURE.md) - Module organization
2. [API_ARCHITECTURE](../03-architecture/API_ARCHITECTURE.md) - API design
3. [DATABASE_ARCHITECTURE](../03-architecture/DATABASE_ARCHITECTURE.md) - Data layer
4. [CICD_PIPELINE_SETUP](./CICD_PIPELINE_SETUP.md) - Deployment pipelines
5. [DATABASE_SETUP_GUIDE](./DATABASE_SETUP_GUIDE.md) - Database initialization

## For Frontend Developers
1. [Frontend Project Structure](./FRONTEND_PROJECT_STRUCTURE.md) - Component organization
2. [SYSTEM_ARCHITECTURE](../03-architecture/SYSTEM_ARCHITECTURE.md) - System design
3. [API_ARCHITECTURE](../03-architecture/API_ARCHITECTURE.md) - API integration
4. [CODING_STANDARDS](../03-architecture/CODING_STANDARDS.md) - Code standards

## For Mobile Developers
1. [Mobile Project Structure](./MOBILE_PROJECT_STRUCTURE.md) - App organization
2. [SYSTEM_ARCHITECTURE](../03-architecture/SYSTEM_ARCHITECTURE.md) - System design
3. [API_ARCHITECTURE](../03-architecture/API_ARCHITECTURE.md) - API integration

## For DevOps/Infrastructure
1. [DOCKER_CONTAINER_SETUP](./DOCKER_CONTAINER_SETUP.md) - Docker configuration
2. [CICD_PIPELINE_SETUP](./CICD_PIPELINE_SETUP.md) - CI/CD pipelines
3. [DEPLOYMENT_ARCHITECTURE](../03-architecture/DEPLOYMENT_ARCHITECTURE.md) - Deployment
4. [INFRASTRUCTURE_ARCHITECTURE](../03-architecture/INFRASTRUCTURE_ARCHITECTURE.md) - Infrastructure

## For QA/Testing
1. [TESTING_STANDARDS](./07-testing/00-overview/README.md) - Testing approach
2. [API_REQUIREMENTS](../02-requirements/Security/API_REQUIREMENTS.md) - API specs
3. [DATABASE_ARCHITECTURE](../03-architecture/DATABASE_ARCHITECTURE.md) - Data structures

---

# Engineering Documentation

## Setup & Environment

| Document | Purpose |
|----------|---------|
| [DEVELOPMENT_ENVIRONMENT_SETUP](./DEVELOPMENT_ENVIRONMENT_SETUP.md) | Local environment setup |
| [DOCKER_CONTAINER_SETUP](./DOCKER_CONTAINER_SETUP.md) | Docker & containers |
| [DATABASE_SETUP_GUIDE](./DATABASE_SETUP_GUIDE.md) | Database initialization |
| [PACKAGE_JSON_SCRIPTS](./PACKAGE_JSON_SCRIPTS.md) | NPM scripts reference |

## Project Structure

| Document | Purpose |
|----------|---------|
| [BACKEND_PROJECT_STRUCTURE](./BACKEND_PROJECT_STRUCTURE.md) | Backend folder organization |
| [FRONTEND_PROJECT_STRUCTURE](./FRONTEND_PROJECT_STRUCTURE.md) | Frontend folder organization |
| [MOBILE_PROJECT_STRUCTURE](./MOBILE_PROJECT_STRUCTURE.md) | Mobile app organization |

## CI/CD & Deployment

| Document | Purpose |
|----------|---------|
| [CICD_PIPELINE_SETUP](./CICD_PIPELINE_SETUP.md) | GitHub Actions workflows |
| [DEPLOYMENT_ARCHITECTURE](../03-architecture/DEPLOYMENT_ARCHITECTURE.md) | Deployment strategy |
| [INFRASTRUCTURE_ARCHITECTURE](../03-architecture/INFRASTRUCTURE_ARCHITECTURE.md) | Infrastructure setup |

---

# Architecture Documentation

## System Design

| Document | Purpose |
|----------|---------|
| [SYSTEM_ARCHITECTURE](../03-architecture/SYSTEM_ARCHITECTURE.md) | High-level system design |
| [MICROSERVICES_ARCHITECTURE](../03-architecture/MICROSERVICES_ARCHITECTURE.md) | Microservices approach |
| [API_ARCHITECTURE](../03-architecture/API_ARCHITECTURE.md) | API layer design |
| [DATABASE_ARCHITECTURE](../03-architecture/DATABASE_ARCHITECTURE.md) | Data layer design |

## Standards & Guidelines

| Document | Purpose |
|----------|---------|
| [CODING_STANDARDS](../03-architecture/CODING_STANDARDS.md) | Code quality standards |
| [GIT_STRATEGY](../03-architecture/GIT_STRATEGY.md) | Git workflow |
| [DOMAIN_DRIVEN_DESIGN](../03-architecture/DOMAIN_DRIVEN_DESIGN.md) | DDD principles |
| [EVENT_DRIVEN_ARCHITECTURE](../03-architecture/EVENT_DRIVEN_ARCHITECTURE.md) | Event system design |

## Technology & Tools

| Document | Purpose |
|----------|---------|
| [TECH_STACK](../03-architecture/TECH_STACK.md) | Technology selections |
| [CI_CD_PIPELINE](../03-architecture/CI_CD_PIPELINE.md) | CI/CD architecture |
| [DEVOPS_ARCHITECTURE](../03-architecture/DEVOPS_ARCHITECTURE.md) | DevOps practices |
| [MONITORING_ARCHITECTURE](../03-architecture/MONITORING_ARCHITECTURE.md) | Monitoring & observability |

---

# Requirements Documentation

## By Domain

| Domain | Reference |
|--------|-----------|
| **Customer** | [Applications Requirements](../02-requirements/Applications/) |
| **API** | [API_REQUIREMENTS](../02-requirements/Security/API_REQUIREMENTS.md) |
| **Database** | [DATABASE_ARCHITECTURE](../03-architecture/DATABASE_ARCHITECTURE.md) |
| **Orders** | [ORDER_MANAGEMENT_REQUIREMENTS](../02-requirements/Operations/ORDER_MANAGEMENT_REQUIREMENTS.md) |
| **Inventory** | [INVENTORY_REQUIREMENTS](../02-requirements/Operations/INVENTORY_REQUIREMENTS.md) |
| **Security** | [SECURITY_REQUIREMENTS](../02-requirements/Security/SECURITY_REQUIREMENTS.md) |
| **AI** | [AI_PLATFORM_REQUIREMENTS](../02-requirements/AI/AI_PLATFORM_REQUIREMENTS.md) |

---

# Quick Reference

## Common Commands

```bash
# Development
pnpm dev                    # Start all services
pnpm lint                   # Run linter
pnpm test                   # Run tests
pnpm format                 # Format code

# Database
pnpm db:migrate             # Run migrations
pnpm db:seed                # Seed test data
pnpm db:reset               # Reset database

# Docker
docker compose up -d        # Start containers
docker compose down         # Stop containers
docker compose logs -f      # View logs

# Git
git checkout -b feature/xxx # Create feature branch
git commit -m "feat: ..."   # Commit with conventional commit
git push origin feature/xxx # Push to origin
```

## Common Paths

```
Backend:   backend/api/src/
Frontend:  apps/website/src/
Mobile:    apps/mobile-app/src/
Database:  database/migrations/
Tests:     {module}/tests/
Config:    {module}/.env
```

## Default Ports

```
Backend API:      http://localhost:3000
Frontend:         http://localhost:3001
Mobile Dev:       http://localhost:8081
PostgreSQL:       localhost:5432
Redis:            localhost:6379
Nginx:            http://localhost:80
```

---

# Troubleshooting

## Common Issues

| Issue | Solution |
|-------|----------|
| Port already in use | Change port or kill process |
| Database connection failed | Check PostgreSQL service |
| Dependencies not installed | Run `pnpm install` |
| TypeScript errors | Run `pnpm type-check` |
| Linting errors | Run `pnpm lint:fix` |

See [DEVELOPMENT_ENVIRONMENT_SETUP](./DEVELOPMENT_ENVIRONMENT_SETUP.md#troubleshooting) for more.

---

# Helpful Resources

## External Documentation
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [NestJS Documentation](https://docs.nestjs.com)
- [React Native Docs](https://reactnative.dev)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Prisma Docs](https://www.prisma.io/docs/)

## Internal Guides

The following milestone completion records were referenced by an earlier documentation plan but have not yet been authored:

- **M2 Requirements Completion** — planned record; not yet created
- **M3 Architecture Completion** — planned record; not yet created
- **M4 Engineering Completion** — planned record; not yet created
- **M5 Project Management** — planned record; not yet created

> **Documentation note:** These entries are intentionally preserved as planned governance records rather than linked to nonexistent files. They SHALL receive links only after their respective artifacts are formally created and reviewed.

---

# Documentation Updates

Last updated: 09 July 2026

This index will be updated as new documentation is added. For latest information, check the `/docs` directory.

---

**Document Status:** ACTIVE  
**Last Updated:** 09 July 2026
