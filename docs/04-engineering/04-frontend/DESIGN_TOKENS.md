# 🎯 DESIGN TOKENS

> Official Design Token Specification for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | DESIGN_TOKENS.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the design tokens used across every Telepizza application.

Design tokens provide a single source of truth for:

- Colors
- Typography
- Spacing
- Border Radius
- Shadows
- Icons
- Breakpoints
- Animations
- Z-Index
- Opacity

These tokens should be implemented consistently across:

- Website
- Admin Panel
- POS
- Kitchen Display
- Customer App
- Rider App
- AI Dashboard

---

# 2. Token Hierarchy

```
Foundation Tokens

↓

Semantic Tokens

↓

Component Tokens

↓

Application UI
```

---

# 3. Color Tokens

## Brand

```text
--color-primary-50
--color-primary-100
--color-primary-200
--color-primary-300
--color-primary-400
--color-primary-500
--color-primary-600
--color-primary-700
--color-primary-800
--color-primary-900
```

---

## Neutral

```text
--color-gray-50
--color-gray-100
--color-gray-200
--color-gray-300
--color-gray-400
--color-gray-500
--color-gray-600
--color-gray-700
--color-gray-800
--color-gray-900
```

---

## Semantic Colors

```text
--color-success
--color-warning
--color-danger
--color-info
```

---

## Surface Colors

```text
--color-background

--color-surface

--color-card

--color-border

--color-divider
```

---

## Text Colors

```text
--color-text-primary

--color-text-secondary

--color-text-muted

--color-text-inverse
```

---

# 4. Typography Tokens

## Font Family

```text
--font-primary

--font-secondary

--font-monospace
```

---

## Font Size

```text
--font-xs

--font-sm

--font-md

--font-lg

--font-xl

--font-2xl

--font-3xl

--font-4xl
```

---

## Font Weight

```text
--font-light

--font-normal

--font-medium

--font-semibold

--font-bold
```

---

## Line Height

```text
--line-tight

--line-normal

--line-relaxed
```

---

# 5. Spacing Tokens

Use an 8-point system.

```text
--space-1

--space-2

--space-3

--space-4

--space-6

--space-8

--space-10

--space-12

--space-16
```

---

# 6. Radius Tokens

```text
--radius-none

--radius-sm

--radius-md

--radius-lg

--radius-xl

--radius-full
```

---

# 7. Border Tokens

```text
--border-thin

--border-default

--border-thick
```

---

# 8. Shadow Tokens

```text
--shadow-xs

--shadow-sm

--shadow-md

--shadow-lg

--shadow-xl
```

---

# 9. Opacity Tokens

```text
--opacity-disabled

--opacity-overlay

--opacity-hover

--opacity-active
```

---

# 10. Z-Index Tokens

```text
--z-dropdown

--z-sticky

--z-fixed

--z-modal

--z-popover

--z-tooltip

--z-toast
```

---

# 11. Animation Tokens

Duration

```text
--duration-fast

--duration-normal

--duration-slow
```

Timing

```text
--ease-in

--ease-out

--ease-in-out
```

---

# 12. Breakpoint Tokens

```text
--breakpoint-sm

--breakpoint-md

--breakpoint-lg

--breakpoint-xl

--breakpoint-2xl
```

---

# 13. Icon Tokens

Sizes

```text
--icon-xs

--icon-sm

--icon-md

--icon-lg

--icon-xl
```

---

# 14. Component Tokens

Buttons

```text
--button-height

--button-radius

--button-padding

--button-gap
```

Inputs

```text
--input-height

--input-radius

--input-padding
```

Cards

```text
--card-radius

--card-padding

--card-shadow
```

Tables

```text
--table-header-height

--table-row-height
```

---

# 15. Light Theme

Uses:

- Light Background
- Dark Text
- Soft Borders

---

# 16. Dark Theme

Uses:

- Dark Background
- Light Text
- Reduced Contrast Glare

All tokens should support theme switching.

---

# 17. Accessibility

Tokens must maintain:

- WCAG 2.2 AA color contrast
- Visible focus indicators
- Consistent spacing
- Readable typography

---

# 18. Tailwind Mapping

Design tokens should map directly to the Tailwind configuration.

Examples:

```text
theme.colors

theme.spacing

theme.fontSize

theme.borderRadius

theme.boxShadow

theme.zIndex
```

---

# 19. React Native Mapping

The same design tokens should be reusable within the React Native theme configuration to ensure visual consistency across web and mobile platforms.

---

# 20. Future Expansion

Future token categories:

- Motion Tokens
- AI Component Tokens
- Data Visualization Tokens
- POS-Specific Tokens
- Kitchen Display Tokens
- Wearable Device Tokens

---

# 21. Related Documents

- DESIGN_SYSTEM.md
- UI_COMPONENT_GUIDE.md
- FRONTEND_BLUEPRINT.md
- MOBILE_BLUEPRINT.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
