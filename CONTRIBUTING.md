# Contributing to Telepizza ROS

First off, thanks for taking the time to contribute! 🎉

This document outlines how to contribute to the Telepizza ROS (Restaurant
Operating System) repository. For engineering governance, see
[`AGENTS.md`](./AGENTS.md). For security reporting, see
[`SECURITY.md`](./SECURITY.md).

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Repository Governance](#repository-governance)
- [Getting Started](#getting-started)
- [Branch Strategy](#branch-strategy)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Database Migrations](#database-migrations)
- [Acceptance Gates](#acceptance-gates)
- [Releases](#releases)

---

## Code of Conduct

Participation in this project is governed by the
[Contributor Covenant 2.1](./CODE_OF_CONDUCT.md). Please be respectful,
constructive, and inclusive.

---

## Repository Governance

This repository follows **Repository Governance v1** as defined in
[`AGENTS.md`](./AGENTS.md) and [`docs/00-governance/`](./docs/00-governance/).

The authority chain is:

```
README.md → AGENTS.md → docs/README.md → docs/00-governance/
  → Architecture → Requirements → Repository Evidence
  → Acceptance Gates → Verified Delivery
```

**Repository evidence is the authoritative implementation source.** Planning
documents, roadmaps, mockups, and architecture proposals are **not**
implementation evidence.

Every delivery slice follows:

```
Founder Authorization → Architecture Review → Implementation
  → Self Verification → Acceptance Gate → Verified Delivery
```

Implementation is never considered verified until the acceptance gate has
been completed.

---

## Getting Started

### Prerequisites

- **Node.js 22 LTS** (see `.nvmrc`)
- **pnpm 10.15.1** (`corepack enable && corepack prepare pnpm@10.15.1 --activate`)
- **Docker** (for local Supabase)
- **Supabase CLI** (`npm install -g supabase`)

### Setup

```bash
# Clone
git clone https://github.com/mianimr4n/telepizza.git
cd telepizza

# Install
pnpm install --frozen-lockfile

# Start local Supabase
supabase start

# Write local envs from Supabase status
pnpm local:env

# Seed local fixtures (Owner + branches + products)
pnpm local:seed

# Start dev stack
pnpm local              # Starts API + website together
# — or separately —
pnpm dev:website        # Vite dev on :3000
pnpm --filter @telepizza/api dev   # tsx watch on :4000
```

### Local Cloud-Binding Guard

**Never run local dev against remote Supabase.** The guard (`pnpm local:guard`)
will block if envs point to a cloud Supabase URL.

```bash
pnpm local:guard        # Verifies local-only
pnpm local:health       # Health check for all services
```

---

## Branch Strategy

| Branch pattern | Purpose | Merges into |
|----------------|---------|-------------|
| `main` | Production-ready, protected | — |
| `feature/<scope>-<desc>` | New feature | `main` via PR |
| `fix/<scope>-<desc>` | Bug fix | `main` via PR |
| `phase2/<x.y>-<desc>` | Phase 2 slice | `main` via PR |
| `docs/<desc>` | Documentation only | `main` via PR |
| `audit/<desc>` | Readiness audit | `main` via PR |
| `qa/<desc>` | Quality assurance | `main` via PR |
| `polish/<desc>` | Polish pass | `main` via PR |
| `chore/<desc>` | Tooling / deps / build | `main` via PR |

### Rules

- **Never push directly to `main`** — always via PR
- **Never force-push** to `main` or any shared branch
- **Never use `git add .` or `git add -A`** — stage explicit paths only
- **Never `git reset`, `git clean`, or `git stash`** on shared branches
- **Delete source branch** after merge (when "Delete head on merge" is enabled)

---

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body — wrap at 72 chars]

[optional footer]
```

### Types

| Type | Use for |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no code change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, deps, tooling |
| `ci` | CI config changes |
| `revert` | Revert a previous commit |

### Scopes (common)

`admin`, `customer`, `api`, `db`, `ui`, `auth`, `payments`, `orders`,
`loyalty`, `referral`, `inventory`, `finance`, `kitchen`, `delivery`,
`config`, `identity`, `phase2`, `polish`, `rc4`, `rc5`, `rc6`

### Examples

```
feat(config): add configuration schemas and versioned configuration (PHASE2-01)
fix(a11y): use panel backgrounds so muted Owner meta text meets contrast
docs(adr): accept Phase 2.1 settings decisions
chore(rc4): release closeout
```

### Rules

- Subject line ≤ 72 chars, imperative mood ("add" not "added")
- Reference PR number in merge commit (auto-handled by GitHub squash-merge)
- Reference issues: `Closes #123`, `Refs #456`
- Breaking changes: add `BREAKING CHANGE:` in footer

---

## Pull Request Process

### 1. Before Opening a PR

```bash
# Update branch with latest main
git fetch origin
git rebase origin/main

# Run all checks locally
pnpm install --frozen-lockfile
pnpm check                    # TypeScript typecheck
pnpm test                     # Unit + backend tests
pnpm test:e2e:owner           # Playwright smoke (requires local stack)
pnpm build:website            # Production build verification
```

**All checks must pass before opening a PR.**

### 2. Open a PR

- Target `main` (or `develop` if it existed — currently we use trunk-based)
- Fill in the PR template (see `.github/PULL_REQUEST_TEMPLATE.md`)
- Title should match the commit subject (Conventional Commits)
- Link related issues: `Closes #123`
- Mark as **Draft** if work is in progress

### 3. Review

- At least 1 approval required (CODEOWNERS will auto-request)
- All CI checks must pass
- All conversations must be resolved
- Branch must be up to date with `main`

### 4. Merge

- **Squash-merge** is the default
- Source branch is deleted after merge
- The squash-merge commit message becomes the canonical commit on `main`

### 5. After Merge

- Delete your local branch: `git branch -D <branch-name>`
- Pull latest main: `git checkout main && git pull`
- If release-worthy, tag and create GitHub Release (see Releases below)

---

## Coding Standards

### TypeScript

- **Strict mode** is on. No `any` without a comment explaining why.
- Prefer `interface` over `type` for object shapes.
- Use `const` assertions for literal unions: `type Status = 'PENDING' | 'PREPARING' as const`.
- All API responses typed — no untyped `Response.json()`.
- Backend modules: ESM (`"type": "module"` in `package.json`)
- Use `.js` extension in relative imports (Node ESM requirement)

### React (Website)

- Function components only. No class components.
- Hooks at the top of the component, before any early returns.
- Custom hooks in `apps/website/client/src/hooks/` prefixed with `use`.
- Use `wouter` for routing (not React Router).
- shadcn/ui primitives for all interactive components.
- Tailwind utility classes only — no CSS modules.

### Express (Backend)

- Always validate input with Zod.
- Always return typed JSON with proper HTTP status codes.
- Always audit-log mutations via `audit_logs` table.
- Use `helmet` (already enabled globally).
- Use the centralized rate limiters for public endpoints.
- Branch authorization via `assertBranchMembership(scope, branchId)` before privileged writes.
- Never trust client-supplied organization identity — resolve server-side.

### File Naming

- Components: `PascalCase.tsx` (e.g. `AdminDashboard.tsx`)
- Hooks: `camelCase.ts` (e.g. `useAdminAuth.ts`)
- API routes: kebab-case directories (e.g. `backend/api/src/modules/admin/`)
- Migrations: `YYYYMMDDHHMMSS_descriptive_name.sql`
- Tests: `*.test.ts` (Vitest) or `*.test.mjs` (Node test runner)
- E2E specs: `*.spec.ts` (Playwright)

### Styling

- Tailwind utility classes only — no CSS modules.
- shadcn/ui primitives for all interactive components.
- Design tokens in `apps/website/client/src/index.css` (`:root` CSS variables).
- No inline `style={{}}` props unless dynamic.

---

## Testing Requirements

### Test Pyramid

| Level | Runner | Location | Purpose |
|-------|--------|----------|---------|
| Unit | `node:test` | `tests/` (137 files) | Pure logic, schema validation |
| Backend integration | Vitest | `backend/api/tests/` (84 files) | API routes, Supabase RPC |
| E2E | Playwright | `e2e/` (36 specs) | Full user journeys in browser |

### What to Test

- **All new features** must have E2E coverage.
- **All bug fixes** must include a regression test.
- **All API routes** must have backend integration tests.
- **All database migrations** must have a test in `tests/database/`.

### Running Tests

```bash
pnpm test              # All unit + backend tests
pnpm test:db           # Database tests only
pnpm test:backend      # Backend tests only
pnpm test:e2e:owner    # Playwright RC5-QA-01 smoke
pnpm rc1:gate          # RC1 quality gate (auth + KDS + BM landing)
```

### Local Stack for E2E

E2E tests require a running local Supabase + API + website:

```bash
pnpm local              # Starts everything
pnpm test:e2e:owner     # Run Playwright against local stack
```

**Never run E2E against Production.** The `pnpm local:guard` will block if
envs point to cloud Supabase.

---

## Database Migrations

### Creating a Migration

```bash
supabase migration new <descriptive_name>
# Creates supabase/migrations/<timestamp>_<name>.sql
```

### Rules

- **Forward-only** — never edit a merged migration; create a new one to revert
- **Additive preferred** — `ALTER TABLE ADD COLUMN` is safe; `DROP COLUMN` is risky
- **Test before merge** — run `pnpm test:db` to verify
- **RLS policies** — every new table needs RLS policies
- **Audit triggers** — every privileged table needs an audit trigger
- **Atomic RPC** — use `BEGIN ... EXCEPTION ... END` for multi-step writes

### Migration Naming

```
YYYYMMDDHHMMSS_phase2_01_configuration_schema_versions.sql
YYYYMMDDHHMMSS_identity_01_tenant_owner_onboarding.sql
```

### Forward-Only Discipline

Migrations are **append-only**. Once merged to `main`, a migration is
immutable. To revert a change, create a new migration that reverses it.

---

## Acceptance Gates

Every delivery slice must pass an acceptance gate before being considered
"verified delivery". See
[`docs/00-governance/ACCEPTANCE_GATES.md`](./docs/00-governance/ACCEPTANCE_GATES.md).

### Gate Components

1. **Architecture PASS** — ADR accepted (if applicable)
2. **Implementation PASS** — code merged to `main`
3. **Repository verification PASS** — tests + typecheck + build green in CI
4. **Acceptance PASS** — evidence folder created in
   `docs/testing/acceptance-evidence/`
5. **Release** (optional) — tagged + GitHub Release created

### Evidence Folder

Each acceptance creates a folder under
`docs/testing/acceptance-evidence/<slice-name>/` containing:

- `README.md` — slice summary
- `SECURITY_PRIVACY_REVIEW.md` — security review
- Screenshots (use Git LFS for large images)
- Test result JSON
- Smoke test outputs

---

## Releases

Releases follow [SemVer](https://semver.org/):

- **MAJOR:** breaking changes (none yet — still pre-2.0)
- **MINOR:** new features, backward-compatible (e.g. v1.5.0 → v1.6.0)
- **PATCH:** bug fixes, backward-compatible (e.g. v1.5.0 → v1.5.1)

### Process

1. Update `CHANGELOG.md` under `[Unreleased]` → move to new version section
2. Update `docs/00-governance/REPOSITORY_STATUS.md` with new tag + commit SHA
3. Create release evidence folder under `docs/testing/acceptance-evidence/`
4. Open PR with these doc updates
5. After merge, tag: `git tag -a v1.6.0 -m "Release v1.6.0"`
6. Push tag: `git push origin v1.6.0`
7. Create GitHub Release with changelog notes

### Tagging

```bash
git tag -a v1.6.0 -m "v1.6.0 — Phase 2 configuration control plane + identity foundation"
git push origin v1.6.0
```

### GitHub Release

Use the GitHub UI or `gh release create`:

```bash
gh release create v1.6.0 \
  --title "v1.6.0 — Phase 2 Configuration Control Plane + Identity Foundation" \
  --notes-file CHANGELOG.md \
  --target main
```

---

## Questions?

- **Engineering:** Open a [Discussion](https://github.com/mianimr4n/telepizza/discussions)
- **Bugs:** Open an [Issue](https://github.com/mianimr4n/telepizza/issues/new?template=bug_report.md)
- **Features:** Open a [Feature Request](https://github.com/mianimr4n/telepizza/issues/new?template=feature_request.md)
- **Security:** See [`SECURITY.md`](./SECURITY.md) — do NOT open a public issue

Happy coding! 🍕
