# 📁 FRONTEND FOLDER STRUCTURE

> Official Frontend Folder Structure Standard for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | FRONTEND_FOLDER_STRUCTURE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official frontend folder structure for all Telepizza web applications.

Applies to:

- Website
- Admin Panel
- Customer Portal
- POS
- Kitchen Dashboard
- Franchise Portal

Objectives

- Scalable Architecture
- Feature-Based Development
- Reusable Components
- AI-Friendly Structure
- Enterprise Maintainability

---

# 2. Technology Stack

Framework

- Next.js (App Router)

Language

- TypeScript

Styling

- Tailwind CSS

UI

- shadcn/ui

Forms

- React Hook Form

Validation

- Zod

State

- TanStack Query
- Zustand

---

# 3. Root Structure

```text
apps/

admin/

src/

app/

components/

features/

hooks/

lib/

providers/

services/

stores/

styles/

types/

utils/

middleware.ts

env.ts
```

---

# 4. App Router Structure

```text
app/

(auth)/

(dashboard)/

(marketing)/

api/

layout.tsx

page.tsx

loading.tsx

error.tsx

not-found.tsx
```

---

# 5. Feature Structure

Every business module follows the same structure.

Example

```text
features/

orders/

components/

hooks/

services/

api/

schemas/

types/

utils/

constants/

store/

index.ts
```

---

# 6. Components

```text
components/

ui/

shared/

layout/

navigation/

forms/

feedback/

tables/

charts/

icons/

ai/
```

---

# 7. Shared Components

Examples

```text
Button

Input

Card

Badge

Dialog

Drawer

DataTable

Modal

Tooltip

Toast
```

---

# 8. Hooks

```text
hooks/

useAuth.ts

usePagination.ts

useDebounce.ts

usePermissions.ts

useInfiniteScroll.ts

useTheme.ts
```

---

# 9. Services

Contains business services.

```text
services/

auth.service.ts

order.service.ts

inventory.service.ts

payment.service.ts
```

Never call HTTP directly inside components.

---

# 10. API Layer

```text
lib/

api/

client.ts

interceptor.ts

endpoints.ts

types.ts
```

Responsibilities

- Authentication
- Token Refresh
- Retry Logic
- Error Handling
- Base URL
- Request Configuration

---

# 11. State Management

```text
stores/

auth.store.ts

theme.store.ts

cart.store.ts

notification.store.ts
```

Guidelines

- TanStack Query → Server State
- Zustand → Client State
- React State → Local UI State

---

# 12. Providers

```text
providers/

theme.provider.tsx

query.provider.tsx

auth.provider.tsx

toast.provider.tsx
```

---

# 13. Styles

```text
styles/

globals.css

theme.css

animations.css
```

No component-specific CSS files unless unavoidable.

---

# 14. Types

```text
types/

api.ts

auth.ts

order.ts

customer.ts

inventory.ts
```

Shared interfaces only.

---

# 15. Utils

```text
utils/

currency.ts

date.ts

validation.ts

format.ts

download.ts
```

Only pure utility functions.

---

# 16. Constants

```text
constants/

routes.ts

permissions.ts

roles.ts

status.ts
```

Avoid hard-coded values.

---

# 17. Assets

```text
public/

images/

icons/

fonts/

logos/
```

---

# 18. Route Groups

```text
(auth)

(dashboard)

(pos)

(kitchen)

(marketing)
```

Use App Router route groups for logical separation.

---

# 19. Naming Convention

Folders

```text
orders

customers

inventory
```

Files

```text
order-card.tsx

customer-table.tsx

payment-dialog.tsx
```

Components

```text
OrderCard.tsx

CustomerTable.tsx
```

Use PascalCase for React components and kebab-case for non-component utility files where appropriate.

---

# 20. Import Rules

Preferred

```typescript
import { Button } from "@/components/ui/button";
import { OrderCard } from "@/features/orders/components/OrderCard";
```

Avoid long relative imports.

---

# 21. Testing Structure

```text
tests/

unit/

integration/

e2e/
```

Component tests should live close to the component when practical.

---

# 22. AI Compatibility

Every feature should expose:

- Components
- Types
- API
- Hooks
- Services

This enables AI-assisted code generation and refactoring.

---

# 23. Scalability Guidelines

New features must:

- Follow the standard feature structure
- Avoid cross-feature dependencies
- Use shared components where possible
- Keep business logic inside features

---

# 24. Related Documents

- FRONTEND_BLUEPRINT.md
- DESIGN_SYSTEM.md
- DESIGN_TOKENS.md
- UI_COMPONENT_GUIDE.md
- MOBILE_BLUEPRINT.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
