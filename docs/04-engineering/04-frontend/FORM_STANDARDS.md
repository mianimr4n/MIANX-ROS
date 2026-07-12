# 📝 FORM STANDARDS

> Official Form Engineering Standards for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | FORM_STANDARDS.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official standards for all forms used across the Telepizza Platform.

Applies to:

- Website
- Customer Portal
- Admin Panel
- POS
- Kitchen Dashboard
- Franchise Portal
- AI Dashboard

Objectives

- Consistent UX
- Reusable Forms
- Validation Standards
- Accessibility
- Enterprise Quality

---

# 2. Technology Stack

Forms

- React Hook Form

Validation

- Zod

UI Components

- shadcn/ui

---

# 3. Form Architecture

```
Form

↓

React Hook Form

↓

Zod Schema

↓

API Client

↓

Backend Validation

↓

Database
```

Validation must exist on both client and server.

---

# 4. Folder Structure

```text
features/

orders/

forms/

create-order.form.tsx

schemas/

create-order.schema.ts

hooks/

use-create-order.ts
```

---

# 5. Standard Form Layout

Every form should contain:

- Title
- Description (optional)
- Form Fields
- Validation Messages
- Primary Button
- Secondary Button
- Loading Indicator

---

# 6. Input Components

Supported inputs:

- Text Input
- Email Input
- Password Input
- Number Input
- Phone Input
- Textarea
- Select
- Multi Select
- Checkbox
- Radio
- Toggle
- Date Picker
- Time Picker
- File Upload
- OTP Input
- Search Input

Reuse shared components wherever possible.

---

# 7. Field Standards

Every field must include:

- Label
- Placeholder
- Validation
- Error Message
- Required Indicator (if applicable)
- Helper Text (when useful)

Example

```
Email *

Placeholder:

Enter your email address
```

---

# 8. Validation Rules

Validation should cover:

- Required fields
- Length
- Email format
- Phone format
- Number range
- Date rules
- Password strength
- Business-specific rules

Use Zod schemas as the single source of truth for client-side validation.

---

# 9. Error Messages

Messages should be:

- Clear
- Human-readable
- Actionable

Good

```
Email address is required.
```

Avoid

```
Validation Error 203
```

---

# 10. Buttons

Primary

```
Save
```

Secondary

```
Cancel
```

Danger

```
Delete
```

While submitting:

- Disable submit button
- Show loading state
- Prevent duplicate submissions

---

# 11. Loading State

Display:

- Loading Spinner
- Button Loading
- Skeleton (for edit forms)

Never allow repeated submissions while a request is pending.

---

# 12. Success State

After success:

- Show toast
- Refresh affected data
- Redirect (if required)
- Reset form only when appropriate

---

# 13. Unsaved Changes

Warn users before leaving a page with unsaved changes.

Example

```
You have unsaved changes.

Leave anyway?
```

---

# 14. File Upload

Support:

- Images
- PDF
- CSV

Validate:

- File Size
- MIME Type
- Maximum File Count

Show upload progress when applicable.

---

# 15. Searchable Selects

Use searchable dropdowns for:

- Products
- Customers
- Suppliers
- Employees
- Branches

Support keyboard navigation.

---

# 16. Multi-Step Forms

Use step indicators.

Example

```
Step 1

↓

Step 2

↓

Step 3

↓

Review

↓

Submit
```

Persist progress if the user navigates between steps.

---

# 17. Accessibility

Every form must support:

- Keyboard Navigation
- Screen Readers
- Focus Indicators
- ARIA Labels
- Accessible Error Messages

Meet WCAG 2.2 AA guidelines where practical.

---

# 18. Responsive Design

Forms should work on:

- Mobile
- Tablet
- Desktop
- POS Touch Screens

Use a single-column layout on small screens where appropriate.

---

# 19. Security

Never trust client validation alone.

Server must validate:

- Input
- Authorization
- Business Rules

Protect against:

- XSS
- CSRF (where applicable)
- Injection attacks

---

# 20. API Integration

Forms should never call APIs directly.

Flow

```
Form

↓

Hook

↓

Service

↓

API Client

↓

Backend
```

---

# 21. Form State

Track:

- Dirty
- Valid
- Submitting
- Success
- Error

Avoid storing temporary form state in global stores unless shared.

---

# 22. Auto Save

Enable auto-save only where appropriate.

Examples

- Draft Reports
- AI Prompts
- Long Notes

Never auto-submit critical business transactions.

---

# 23. Testing

Test:

- Validation
- Submission
- Error Handling
- Accessibility
- Loading States
- Keyboard Navigation

---

# 24. Best Practices

- Keep forms focused.
- Group related fields.
- Minimize required inputs.
- Use sensible defaults.
- Show inline validation.
- Preserve user input on recoverable errors.

---

# 25. Related Documents

- FRONTEND_BLUEPRINT.md
- DESIGN_SYSTEM.md
- UI_COMPONENT_GUIDE.md
- STATE_MANAGEMENT.md
- API_CLIENT_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
