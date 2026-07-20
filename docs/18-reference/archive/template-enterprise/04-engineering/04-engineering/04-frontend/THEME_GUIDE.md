# 🎨 THEME GUIDE

> Official Theme Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | THEME_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official theming strategy for all Telepizza Platform applications.

Applies to

- Website
- Customer Portal
- Admin Panel
- POS
- Kitchen Dashboard
- Rider App
- AI Dashboard

Objectives

- Consistent Branding
- Theme Customization
- Accessibility
- Enterprise Scalability

---

# 2. Theme Architecture

```
Design Tokens

↓

Theme Variables

↓

Component Tokens

↓

UI Components

↓

Applications
```

Themes should never override component logic.

---

# 3. Theme Types

Support

```
Light Theme

↓

Dark Theme

↓

System Theme

↓

High Contrast Theme (Future)

↓

Brand Themes (Future)
```

---

# 4. Light Theme

Characteristics

- Light Background
- Dark Text
- Soft Shadows
- Neutral Surfaces

Recommended for daytime use.

---

# 5. Dark Theme

Characteristics

- Dark Background
- Light Text
- Reduced Eye Strain
- High Readability

Recommended for low-light environments.

---

# 6. System Theme

Automatically follow the operating system preference.

Support

```
prefers-color-scheme
```

---

# 7. Theme Variables

Examples

```
--background

--surface

--card

--border

--primary

--secondary

--success

--warning

--danger

--text-primary

--text-secondary
```

Never hardcode colors inside components.

---

# 8. Typography Theme

Theme controls

- Font Family
- Font Size
- Font Weight
- Line Height

Typography should remain readable across themes.

---

# 9. Spacing Theme

Controlled using design tokens.

Example

```
4

8

12

16

24

32

48

64
```

---

# 10. Border Radius

Tokens

```
None

Small

Medium

Large

Extra Large

Full
```

---

# 11. Shadows

Levels

```
XS

SM

MD

LG

XL
```

Dark theme shadows should be softer.

---

# 12. Component Theming

Components inherit theme automatically.

Examples

- Button
- Card
- Modal
- Table
- Input
- Dialog
- Badge

---

# 13. Theme Switching

Users may switch themes from

```
Settings

↓

Appearance

↓

Theme
```

Persist preference across sessions.

---

# 14. Branding

Future support

- Franchise Branding
- Corporate Branding
- Seasonal Campaign Themes

Brand customization should reuse existing tokens.

---

# 15. Accessibility

Themes must satisfy

- WCAG 2.2 AA
- Contrast Ratios
- Focus Visibility

Do not reduce readability for aesthetics.

---

# 16. Charts

Charts should automatically adapt to

- Background
- Grid
- Labels
- Legends

Maintain color consistency.

---

# 17. Images & Icons

Ensure

- Transparent assets work in both themes
- Logos have light/dark variants if needed

---

# 18. Theme Performance

Recommendations

- CSS Variables
- Minimal Re-rendering
- Lazy Theme Initialization

Avoid flashing during theme changes.

---

# 19. Testing

Verify

- Theme Switching
- System Theme
- Contrast
- Components
- Charts
- Forms
- Tables

---

# 20. Best Practices

- Build from tokens.
- Avoid hardcoded colors.
- Support system preference.
- Test every component in all themes.
- Keep branding consistent.

---

# 21. Related Documents

- DESIGN_SYSTEM.md
- DESIGN_TOKENS.md
- ACCESSIBILITY_GUIDE.md
- UI_COMPONENT_GUIDE.md
- ICONOGRAPHY_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
