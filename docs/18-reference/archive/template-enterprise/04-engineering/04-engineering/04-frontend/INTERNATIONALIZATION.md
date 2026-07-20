# 🌍 INTERNATIONALIZATION (i18n)

> Official Internationalization Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | INTERNATIONALIZATION.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the internationalization (i18n) and localization (l10n) standards for all Telepizza Platform frontend applications.

Applies to:

- Website
- Customer Portal
- Admin Panel
- POS
- Kitchen Dashboard
- Franchise Portal
- Mobile Applications

Objectives

- Multi-language Support
- Multi-region Readiness
- RTL/LTR Compatibility
- Localized Content
- Enterprise Scalability

---

# 2. Technology Stack

Framework

- Next.js

Library

- next-intl

Language Files

- JSON

---

# 3. Supported Languages

Initial

```text
English (en)

Urdu (ur)
```

Future

```text
Arabic (ar)

French (fr)

Spanish (es)

Turkish (tr)
```

---

# 4. Folder Structure

```text
messages/

en/

common.json

orders.json

customers.json

inventory.json

settings.json

ur/

common.json

orders.json

customers.json

inventory.json

settings.json
```

---

# 5. Locale Routing

Example

```text
/en

/ur

/ar
```

Public pages should support locale-based URLs.

---

# 6. Translation Keys

Use dot notation.

Examples

```text
auth.login

auth.logout

order.status.pending

customer.name

inventory.available
```

Avoid using visible text as translation keys.

---

# 7. Namespace Strategy

Split translations by feature.

Examples

```text
auth

dashboard

orders

customers

inventory

reports

settings
```

Do not place all translations in a single file.

---

# 8. Language Switching

Users should be able to switch language without losing their current page.

Persist preference using:

- User Profile
- Cookie
- Local Storage (fallback)

---

# 9. RTL Support

Support

```text
LTR

RTL
```

Languages requiring RTL

```text
Arabic

Urdu (optional based on product decision)
```

Layouts should automatically adapt where RTL is enabled.

---

# 10. Date Formatting

Use locale-aware formatting.

Examples

```text
07 Jul 2026

07/07/2026

July 7, 2026
```

Do not hard-code date formats.

---

# 11. Time Formatting

Support

- 12-hour
- 24-hour

Respect user or locale preference.

---

# 12. Number Formatting

Examples

```text
1,000

10,500

1,250,000
```

Use locale-specific separators.

---

# 13. Currency Formatting

Support

```text
PKR

USD

AED

EUR
```

Example

```text
Rs. 1,250

$150

AED 90
```

Never concatenate currency strings manually.

---

# 14. Validation Messages

All validation messages must be translated.

Example

```text
Email is required.

Password is too short.
```

---

# 15. Error Messages

Translate

- API Errors
- Validation Errors
- Business Errors
- Network Errors

Maintain consistent terminology across languages.

---

# 16. Dynamic Content

Support interpolation.

Example

```text
Welcome, {name}

Order #{orderNumber}

{count} items
```

Avoid string concatenation in code.

---

# 17. Pluralization

Support plural forms.

Examples

```text
1 Item

2 Items

10 Items
```

Use library-supported pluralization rules.

---

# 18. AI Content

AI-generated responses should include language context when supported.

The UI should indicate the language being used and allow users to switch language without affecting system functionality.

---

# 19. Accessibility

Localized content must also satisfy:

- WCAG 2.2 AA
- Screen Reader Support
- Keyboard Navigation

---

# 20. Testing

Verify

- Language Switching
- RTL Layout
- Date Formatting
- Currency Formatting
- Missing Translation Keys
- Responsive Layout
- Text Overflow

---

# 21. Best Practices

- Never hard-code user-facing text.
- Use translation keys consistently.
- Keep translation files modular.
- Avoid duplicate keys.
- Review translations before release.

---

# 22. Related Documents

- FRONTEND_BLUEPRINT.md
- DESIGN_SYSTEM.md
- ROUTING_STRATEGY.md
- ACCESSIBILITY_GUIDE.md
- FORM_STANDARDS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
