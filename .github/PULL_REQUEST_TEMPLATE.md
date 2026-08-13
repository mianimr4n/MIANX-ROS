## 📋 Summary

<!-- Brief description of what this PR does. 1-3 sentences. -->

## 🔗 Related Issue / ADR

<!-- "Closes #123" / "Refs #456" / "Implements ADR-007" / "N/A" -->

Closes #

## 🔄 Type of Change

<!-- Check all that apply -->

- [ ] 🚀 **feat** — New feature
- [ ] 🐛 **fix** — Bug fix
- [ ] 💥 **breaking** — Breaking change (requires major version bump)
- [ ] 📚 **docs** — Documentation only
- [ ] 🎨 **style** — Formatting / UI polish
- [ ] ♻️ **refactor** — Code restructuring (no behavior change)
- [ ] ⚡ **perf** — Performance improvement
- [ ] 🧪 **test** — Adding / fixing tests
- [ ] 🔧 **chore** — Tooling / deps / build
- [ ] 🚀 **ci** — CI/CD changes

## 📍 Affected Area

- [ ] Customer storefront (`apps/website/client/src/pages/`)
- [ ] Admin panel (`apps/website/client/src/pages/admin/`)
- [ ] Ops dashboard (`apps/website/client/src/pages/ops/`)
- [ ] Supplier portal (`apps/website/client/src/pages/supplier/`)
- [ ] API endpoint(s): `<!-- /api/v1/... -->`
- [ ] Database / Supabase migration
- [ ] Phase 2.x domain: `<!-- specify -->`
- [ ] Infrastructure (Docker / Vercel / Render / CI)
- [ ] Documentation
- [ ] Other: `<!-- describe -->`

## 🧪 Test Plan

<!-- How did you verify this change? Check all that apply. -->

- [ ] Manual testing in browser (viewports: 390, 768, 1440)
- [ ] Unit tests (`pnpm test:db`)
- [ ] Backend integration tests (`pnpm test:backend`)
- [ ] E2E tests added / updated (file: `<!-- e2e/... -->`)
- [ ] All existing tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm check`)
- [ ] Production build succeeds (`pnpm build:website`)
- [ ] Local cloud-binding guard passes (`pnpm local:guard`)
- [ ] No fatal console errors
- [ ] No uncaught page errors
- [ ] axe critical violations = 0
- [ ] axe serious violations = 0

### Test Details

<!-- Describe what you tested and any edge cases you considered. -->

## 📸 Screenshots / Recordings

<!-- For UI changes, attach before/after screenshots or a screen recording. -->

| Before | After |
|--------|-------|
|        |       |

## 📝 Database Migration

<!-- If this PR adds a Supabase migration, document it here. -->

- [ ] No database changes
- [ ] Migration added: `<!-- YYYYMMDDHHMMSS_name.sql -->`
- [ ] Forward-only (no edits to existing migrations)
- [ ] RLS policies included
- [ ] Audit triggers included (if privileged table)
- [ ] Migration test added: `<!-- tests/database/... -->`
- [ ] Backward-compatible (old data still readable)

## 🔐 Security Considerations

<!-- If this PR touches auth, payments, PII, or admin actions, address security. -->

- [ ] N/A (no security-sensitive changes)
- [ ] Input validation added (Zod)
- [ ] Auth check added (`requireAdmin` / `requireCustomer` / `assertBranchMembership`)
- [ ] Audit logging added for mutations
- [ ] No secrets committed
- [ ] No new dependencies that introduce vulnerabilities
- [ ] Branch isolation enforced (cross-branch writes rejected)
- [ ] Secrets masked in API responses (if `is_secret` schema)

## 📚 Documentation Updates

- [ ] `CHANGELOG.md` updated under `[Unreleased]`
- [ ] `docs/00-governance/REPOSITORY_STATUS.md` updated (if release-worthy)
- [ ] ADR updated (if architectural decision)
- [ ] Acceptance evidence folder created (`docs/testing/acceptance-evidence/<slice>/`)
- [ ] `README.md` / `AGENTS.md` updated (if structural change)
- [ ] `.env.example` updated (if new env var)

## ✅ Pre-Merge Checklist

- [ ] Branch is up to date with `main` (rebased)
- [ ] Commit messages follow Conventional Commits
- [ ] No `console.log` / debug code left in
- [ ] No commented-out code blocks
- [ ] No `git add .` or `git add -A` used (explicit paths only)
- [ ] Self-reviewed the diff
- [ ] CODEOWNERS auto-requested
- [ ] All CI checks green
- [ ] All conversations resolved

## 📎 Additional Notes

<!-- Anything else reviewers should know? -->

## 🚫 Prohibitions Reminder

Per `AGENTS.md`, this PR must NOT:

- Use `git add .` or `git add -A`
- Use `git reset`, `git clean`, or `git stash` on shared branches
- Force-push
- Direct commit to `main`
- Store payment-provider secrets in database tables
- Store card numbers, CVV, passwords, access tokens, or private keys
- Execute a real payment transaction in tests
- Send a real customer notification in tests
- Mark a physical device verified because a web route loads
- Activate Northern Bypass without explicit Founder authorization
- Mutate Production
