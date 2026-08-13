# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.6.x   | ✅ Active          |
| 1.5.x   | ✅ Maintenance     |
| < 1.5   | ❌ Not supported   |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

The Telepizza ROS platform handles customer PII, payment provider integrations,
and operational business data. Security vulnerabilities must be reported
privately so they can be triaged and patched before public disclosure.

### How to Report

1. **Email:** `security@mianx.ai` with subject line `[VULN] Telepizza ROS — <short description>`
2. **PGP:** Request our public key by emailing the above address first
3. **GitHub Private Vulnerability Reporting:** Use the "Report a vulnerability"
   button on the Security tab of this repository (if enabled)

### What to Include

- Description of the vulnerability
- Affected versions (commit SHA or tag if possible)
- Steps to reproduce
- Proof of concept (if available)
- Potential impact (data exposure, privilege escalation, denial of service, etc.)
- Suggested fix (if any)

### Response SLA

| Action | Target |
|--------|--------|
| Acknowledge receipt | 48 hours |
| Initial triage + severity rating | 5 business days |
| Status update | Every 7 days until resolved |
| Fix or mitigation | 30 days (Critical), 60 days (High), 90 days (Medium/Low) |
| Public disclosure | After fix is released + 14-day grace period |

### Scope

**In scope:**
- Authentication bypass
- Authorization flaws (privilege escalation, cross-branch access, cross-tenant access)
- SQL injection or other injection flaws
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Sensitive data exposure (PII, payment data, secrets)
- Security misconfiguration (CORS, headers, etc.)
- Insecure direct object references (IDOR)
- Missing rate limiting on sensitive endpoints
- Secrets accidentally committed to the repository

**Out of scope:**
- Vulnerabilities in third-party dependencies (report to upstream)
- Self-XSS or XSS requiring user to paste payload
- Clickjacking on non-sensitive pages
- Missing security headers on static assets
- Reports from automated scanners without PoC
- Social engineering attacks
- Physical security attacks
- DoS requiring more than 1000 requests/second

### Reward

We do not currently offer a monetary bug bounty. Valid security reporters will
be credited in the release notes (unless they prefer to remain anonymous).

---

## Security Architecture

### Secrets Boundary

Per ADR-003 (proposed), provider secrets MUST NEVER be written to database
tables or client bundles. The database stores only secret reference keys
(e.g. `provider_config_ref: "WHATSAPP_API_KEY"`), resolved at backend runtime
from server environment variables.

If you discover a secret committed to this repository:

1. **Do NOT open a public issue**
2. Email `security@mianx.ai` immediately
3. Assume the secret is compromised — rotate it in the provider dashboard
4. We will remove the secret from history via `git filter-repo`

### Authentication

- Customer auth: Supabase Auth (JWT-based)
- Admin auth: Custom JWT (`API_JWT_SECRET` env var, ≥16 chars)
- Passwords: bcrypt-hashed (never stored in plaintext)
- Sessions: 7-day expiry (customer), 8-hour expiry (admin)

### Authorization (RBAC)

Canonical roles (per `AGENTS.md`):

| Role | Code | Scope |
|------|------|-------|
| Super Admin | `super-admin` | All branches + system config |
| Branch Manager | `branch-manager` | Own branch only |
| Kitchen | `kitchen` | Own branch kitchen |
| Cashier | `cashier` | Own branch POS |
| Rider | `rider` | Own deliveries |
| Customer Support | `customer-support` | All customers (read) |
| Host | `host` | Own branch floor |
| Waiter | `waiter` | Own branch tables |

**Forbidden role codes** (must never exist): `owner`, `founder`, `admin`,
`delivery`, `general-staff`, `staff`. Founder and Owner are display labels
mapped internally to `super-admin`.

### Branch Isolation

Non-super-admin users can only access data within their assigned branch.
Server-side enforcement via `assertBranchMembership(scope, branchId)` before
all privileged writes. Client-supplied branch IDs are validated against the
authenticated user's branch membership.

### Audit Trail

All privileged mutations are logged to `audit_logs` and
`configuration_change_log` (Phase 2.1+) with:
- Actor (user ID + role)
- Action type
- Before/after state (JSONB)
- Timestamp (Asia/Karachi)
- IP address (where applicable)

`configuration_change_log` is **append-only** (UPDATE/DELETE blocked by
Postgres triggers).

### Rate Limiting

Public endpoints have custom rate limiters:
- Order quote: 30 req/min per IP
- Guest order access: 20 req/min per IP
- Dine-in resolve: 60 req/min per IP
- Public booking: 20 req/min per IP

### Security Headers

Backend uses `helmet` middleware for:
- Strict-Transport-Security
- X-Content-Type-Options: nosniff
- X-Frame-Options: SAMEORIGIN
- Referrer-Policy
- Content-Security-Policy (default-src 'self')

---

## Dependency Security

- **Lockfile:** `pnpm-lock.yaml` is committed; `--frozen-lockfile` enforced in CI
- **Audit:** Run `pnpm audit` locally before merging
- **Pinned versions:** Major versions pinned in `package.json`
- **Security overrides:** Applied via `pnpm.overrides` in root `package.json`

---

## Incident Response

### Severity Levels

| Severity | Definition | Examples |
|----------|-----------|----------|
| Critical | Active exploitation, data breach, full service outage | Auth bypass, SQL injection in production |
| High | Significant vulnerability, partial outage | Privilege escalation, RCE in non-prod |
| Medium | Limited impact, requires specific conditions | IDOR on non-sensitive data |
| Low | Minimal impact, theoretical | Missing security header on static asset |

### Process

1. **Triage** — Security lead confirms validity + assigns severity
2. **Contain** — Disable vulnerable endpoint if needed (feature flag)
3. **Fix** — Develop patch on private branch
4. **Test** — Verify fix + add regression test
5. **Deploy** — Coordinate with DevOps for emergency release
6. **Disclose** — Public advisory after fix is widely deployed
7. **Postmortem** — Root cause analysis within 7 days

---

## Contact

- **General security questions:** `security@mianx.ai`
- **PGP key:** Request via email
- **Coordinated disclosure:** We follow ISO/IEC 29147

---

## Acknowledgments

We thank security researchers who responsibly disclose vulnerabilities. Valid
reporters will be listed here (with permission):

*(No reports yet)*
