# 🧭 ROUTING STRATEGY

> Official Frontend Routing Strategy for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | ROUTING_STRATEGY.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the routing strategy for all Telepizza web applications using Next.js App Router.

Applies to:

- Website
- Admin Panel
- Customer Portal
- POS
- Kitchen Dashboard
- Franchise Portal

---

# 2. Routing Principles

Routes must be:

- Clear
- SEO-friendly where public
- Protected where private
- Role-aware
- Branch-aware
- Scalable
- Consistent

---

# 3. Route Groups

Use Next.js route groups.

```text
app/

(auth)/
(marketing)/
(customer)/
(dashboard)/
(pos)/
(kitchen)/
(franchise)/
```

---

# 4. Public Routes

```text
/
menu
deals
branches
about
contact
privacy-policy
terms
```

---

# 5. Auth Routes

```text
(auth)/login
(auth)/register
(auth)/forgot-password
(auth)/reset-password
(auth)/verify-otp
```

---

# 6. Customer Routes

```text
(customer)/account
(customer)/orders
(customer)/orders/[id]
(customer)/addresses
(customer)/loyalty
(customer)/support
```

---

# 7. Admin Routes

```text
(dashboard)/dashboard
(dashboard)/orders
(dashboard)/customers
(dashboard)/menu
(dashboard)/inventory
(dashboard)/payments
(dashboard)/reports
(dashboard)/settings
```

---

# 8. POS Routes

```text
(pos)/pos
(pos)/pos/orders
(pos)/pos/payments
(pos)/pos/shift-close
```

---

# 9. Kitchen Routes

```text
(kitchen)/kitchen
(kitchen)/kitchen/queue
(kitchen)/kitchen/completed
```

---

# 10. Dynamic Routes

Use dynamic route segments:

```text
orders/[id]
customers/[id]
products/[id]
branches/[id]
```

---

# 11. Protected Routes

Private routes require:

- Valid session
- Role permission
- Branch access where applicable

Unauthorized users should be redirected to:

```text
/login
```

Forbidden users should see:

```text
/403
```

---

# 12. Middleware

Use `middleware.ts` for:

- Authentication checks
- Locale detection
- Branch context
- Redirects
- Public/private route separation

---

# 13. Role-Based Routing

Example:

```text
Admin → dashboard
Cashier → pos
Kitchen Staff → kitchen
Customer → account
```

---

# 14. Branch Context

Admin users may switch branches.

Branch-aware routes should include branch context through:

- Session
- Header
- Query param where needed
- Global store

Avoid exposing sensitive branch logic only on client side.

---

# 15. SEO Routes

Public website routes should support:

- Metadata
- Open Graph
- Canonical URLs
- Sitemap
- Robots.txt

---

# 16. Error Routes

Required:

```text
not-found.tsx
error.tsx
global-error.tsx
```

Custom pages:

```text
/403
/500
/maintenance
```

---

# 17. Loading States

Use:

```text
loading.tsx
```

for route-level loading.

---

# 18. Layout Strategy

Use nested layouts:

```text
app/layout.tsx
app/(dashboard)/layout.tsx
app/(pos)/layout.tsx
app/(kitchen)/layout.tsx
```

---

# 19. Navigation Rules

Navigation should be generated from:

- User role
- Permissions
- Current branch
- Feature flags

Avoid hard-coded navigation.

---

# 20. Deep Linking

Support deep links for:

- Orders
- Payments
- Customer profiles
- Support tickets
- Reports

---

# 21. Related Documents

- FRONTEND_BLUEPRINT.md
- FRONTEND_FOLDER_STRUCTURE.md
- DESIGN_SYSTEM.md
- API_SPECIFICATIONS.md
- AUTHORIZATION_REQUIREMENTS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
