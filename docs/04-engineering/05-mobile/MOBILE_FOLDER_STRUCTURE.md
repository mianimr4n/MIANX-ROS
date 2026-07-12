# 📁 MOBILE FOLDER STRUCTURE

> Official Mobile Folder Structure Standard for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Engineering |
| Document | MOBILE_FOLDER_STRUCTURE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official folder structure for all Telepizza mobile applications.

Applies to

- Customer App
- Rider App
- Manager App
- Franchise App
- AI Assistant App

Objectives

- Feature-Based Architecture
- Reusable Components
- Enterprise Scalability
- AI-Friendly Development
- Maintainable Codebase

---

# 2. Technology Stack

Framework

- React Native
- Expo

Language

- TypeScript

Navigation

- Expo Router

State Management

- Zustand
- TanStack Query

---

# 3. Root Structure

```text
apps/

mobile/

app/

assets/

components/

config/

constants/

features/

hooks/

lib/

providers/

services/

stores/

styles/

types/

utils/

middleware/

```

---

# 4. App Router Structure

```text
app/

(auth)/

(tabs)/

(customer)/

(rider)/

(manager)/

(ai)/

modal/

_layout.tsx

index.tsx

+not-found.tsx
```

---

# 5. Feature Structure

Every business module follows the same structure.

```text
features/

orders/

api/

components/

hooks/

screens/

schemas/

services/

store/

types/

utils/

constants/

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

cards/

lists/

feedback/

charts/

ai/

icons/
```

---

# 7. Screens

Business screens remain inside feature folders.

Example

```text
features/

orders/

screens/

OrderListScreen.tsx

OrderDetailScreen.tsx

CreateOrderScreen.tsx
```

---

# 8. Hooks

```text
hooks/

useAuth.ts

useLocation.ts

useNetwork.ts

useCamera.ts

useNotifications.ts

useBiometrics.ts
```

---

# 9. Services

```text
services/

auth.service.ts

order.service.ts

customer.service.ts

payment.service.ts

notification.service.ts
```

Business logic belongs here.

---

# 10. API Layer

```text
lib/

api/

client.ts

interceptors.ts

config.ts

endpoints.ts

errors.ts
```

All HTTP requests pass through this layer.

---

# 11. Stores

```text
stores/

auth.store.ts

theme.store.ts

cart.store.ts

location.store.ts

network.store.ts

notification.store.ts
```

Separate server state from client state.

---

# 12. Providers

```text
providers/

AuthProvider.tsx

ThemeProvider.tsx

QueryProvider.tsx

NotificationProvider.tsx
```

---

# 13. Assets

```text
assets/

images/

icons/

fonts/

animations/

sounds/

illustrations/
```

Optimize all assets before committing.

---

# 14. Styles

```text
styles/

theme.ts

colors.ts

spacing.ts

typography.ts

shadows.ts
```

Use design tokens instead of hardcoded values.

---

# 15. Types

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

# 16. Utils

```text
utils/

currency.ts

date.ts

format.ts

validation.ts

permissions.ts
```

Only pure helper functions.

---

# 17. Constants

```text
constants/

routes.ts

roles.ts

permissions.ts

status.ts

config.ts
```

Avoid magic strings throughout the application.

---

# 18. Testing

```text
tests/

unit/

integration/

e2e/

fixtures/
```

---

# 19. Naming Convention

Folders

```text
orders

customers

inventory

payments
```

Files

```text
order.service.ts

customer.store.ts

payment.schema.ts
```

React Components

```text
OrderCard.tsx

CustomerForm.tsx

AiAssistantScreen.tsx
```

---

# 20. Import Strategy

Preferred

```typescript
import { OrderCard } from "@/features/orders/components/OrderCard";

import { Button } from "@/components/ui/Button";
```

Avoid deeply nested relative imports.

---

# 21. Scalability

New features must

- Follow the feature template
- Keep business logic inside features
- Reuse shared components
- Avoid cross-feature coupling

---

# 22. AI Readiness

Each feature should expose

- Components
- Hooks
- API
- Types
- Services

This enables AI-assisted code generation and easier maintenance.

---

# 23. Best Practices

- Keep features isolated.
- Reuse shared UI.
- Centralize networking.
- Organize by feature, not file type.
- Keep folder names consistent.

---

# 24. Related Documents

- MOBILE_BLUEPRINT.md
- MOBILE_COMPONENT_GUIDE.md
- MOBILE_DESIGN_SYSTEM.md
- MOBILE_SECURITY.md
- OFFLINE_SYNC.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
