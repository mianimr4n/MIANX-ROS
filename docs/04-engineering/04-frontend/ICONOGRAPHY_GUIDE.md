# 🎯 ICONOGRAPHY GUIDE

> Official Iconography & Visual Language Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | ICONOGRAPHY_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official iconography standards for all Telepizza Platform applications.

Applies to

- Website
- Customer Portal
- Admin Panel
- POS
- Kitchen Dashboard
- Rider App
- Franchise Portal
- AI Dashboard

Objectives

- Consistent Visual Language
- Better Recognition
- Accessibility
- Reusable Components
- Enterprise Design Standards

---

# 2. Icon Philosophy

Icons should be

- Simple
- Recognizable
- Consistent
- Accessible
- Minimal
- Functional

Icons should support content, not replace it.

---

# 3. Icon Library

Primary Library

```
Lucide React
```

Future

- Custom SVG Icons
- Brand Icons
- Partner Logos

Avoid mixing multiple icon libraries.

---

# 4. Icon Categories

Navigation

Actions

Status

Commerce

Restaurant

Finance

Reports

AI

System

Communication

---

# 5. Navigation Icons

Examples

```
Dashboard

Home

Orders

Customers

Products

Inventory

Reports

Settings

Profile

Logout
```

Navigation icons should remain consistent across all applications.

---

# 6. Action Icons

Examples

```
Add

Edit

Delete

View

Print

Download

Upload

Refresh

Search

Filter

Share

Duplicate
```

Use the same icon for the same action everywhere.

---

# 7. Status Icons

Examples

```
Success

Warning

Error

Information

Pending

Completed

Cancelled
```

Icons should always be accompanied by text where meaning is important.

---

# 8. Restaurant Icons

Examples

```
Pizza

Kitchen

Chef

Delivery

Branch

Menu

Table

Order

Receipt

Discount
```

---

# 9. Finance Icons

Examples

```
Payment

Invoice

Refund

Wallet

Revenue

Expense

Tax
```

---

# 10. AI Icons

Examples

```
AI Assistant

Recommendation

Insight

Automation

Prediction

Chat

Workflow
```

AI icons should clearly distinguish AI features from standard system actions.

---

# 11. Icon Sizes

Use standard sizes

```
12 px

16 px

20 px

24 px

32 px

48 px
```

Do not use arbitrary sizes.

---

# 12. Stroke Width

Standard

```
2 px
```

Maintain consistency across all icons.

---

# 13. Color Usage

Icons inherit semantic colors.

Examples

Primary

Success

Warning

Danger

Muted

Avoid decorative colors that reduce clarity.

---

# 14. Filled vs Outline

Preferred

```
Outline
```

Use filled icons only for

- Active State
- Selected State
- Special Indicators

---

# 15. Interactive States

Support

```
Default

Hover

Focus

Active

Disabled
```

Provide clear visual feedback for interactive icons.

---

# 16. Accessibility

Icons must support

- aria-label
- aria-hidden (for decorative icons)
- Keyboard Accessibility (when interactive)

Do not rely on icons alone to communicate meaning.

---

# 17. Responsive Behaviour

Icons should scale consistently across

- Mobile
- Tablet
- Desktop
- POS Displays

Maintain touch-friendly spacing.

---

# 18. Performance

Recommendations

- Use SVG
- Tree-shake unused icons
- Lazy-load large icon sets
- Optimize custom SVG files

Avoid large image-based icons.

---

# 19. Custom Icons

Custom SVGs should

- Match stroke width
- Match corner radius
- Match design language
- Be optimized

Store under

```text
assets/icons/
```

---

# 20. File Naming

Use kebab-case

Examples

```text
order.svg

customer.svg

inventory.svg

ai-assistant.svg

sales-report.svg
```

React Components

```text
OrderIcon.tsx

CustomerIcon.tsx

AiAssistantIcon.tsx
```

---

# 21. Testing

Verify

- Correct Icon
- Accessibility
- Theme Compatibility
- Responsive Scaling
- Performance
- Visual Consistency

---

# 22. Best Practices

- Reuse existing icons.
- Keep icons recognizable.
- Pair icons with labels where needed.
- Avoid excessive decoration.
- Maintain consistency across modules.

---

# 23. Related Documents

- DESIGN_SYSTEM.md
- DESIGN_TOKENS.md
- UI_COMPONENT_GUIDE.md
- THEME_GUIDE.md
- ACCESSIBILITY_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
