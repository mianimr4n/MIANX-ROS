# 💬 EMPTY STATES AND FEEDBACK

> Official User Feedback & Empty State Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | EMPTY_STATES_AND_FEEDBACK.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the standard patterns for user feedback across all Telepizza Platform applications.

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

- Consistent User Experience
- Clear Communication
- Better Recovery
- Predictable UI Behaviour

---

# 2. Feedback Types

The platform supports

```
Loading

↓

Success

↓

Information

↓

Warning

↓

Error

↓

Empty

↓

Confirmation
```

---

# 3. Empty States

Every empty page must include

- Illustration or Icon
- Title
- Description
- Primary Action
- Optional Secondary Action

Example

```
No Orders Found

Create your first order.

[ Create Order ]
```

---

# 4. Empty State Categories

Examples

- No Orders
- No Customers
- No Products
- No Inventory
- No Reports
- No Search Results
- No Notifications

Each should provide a meaningful next step.

---

# 5. Loading States

Use

- Skeleton
- Spinner
- Progress Bar
- Placeholder Cards

Never show blank screens while data is loading.

---

# 6. Skeleton Standards

Skeletons should resemble the final layout.

Examples

- Table Rows
- KPI Cards
- Charts
- Forms
- Lists

---

# 7. Success Feedback

Display after

- Save
- Update
- Delete
- Import
- Export
- Upload
- Payment
- AI Task Completion

Example

```
Order created successfully.
```

---

# 8. Information Messages

Examples

```
New version available.

Inventory synchronization completed.

Maintenance scheduled tonight.
```

---

# 9. Warning Messages

Use for recoverable situations.

Examples

```
Unsaved changes.

Low inventory.

Session expires in 2 minutes.
```

---

# 10. Error Messages

Characteristics

- Clear
- Actionable
- Friendly

Good

```
Unable to load customer data.

Please try again.
```

Avoid technical stack traces.

---

# 11. Confirmation Dialogs

Required before

- Delete
- Refund
- Cancel
- Archive
- Reset
- Logout (optional)

Structure

```
Title

↓

Explanation

↓

Impact

↓

Confirm

↓

Cancel
```

---

# 12. Toast Notifications

Use for

- Save Success
- Background Updates
- Minor Errors
- Informational Events

Placement

```
Top Right
```

Duration

```
3–5 Seconds
```

Critical alerts should not disappear automatically.

---

# 13. Inline Validation

Display errors immediately after interaction.

Example

```
Password must contain at least 8 characters.
```

---

# 14. Progress Indicators

Use for

- File Uploads
- Imports
- Exports
- AI Tasks
- Report Generation

Display

- Percentage
- Current Step
- Estimated Time (if available)

---

# 15. Retry Patterns

Offer retry for

- Network Failure
- Timeout
- Temporary Server Error

Do not automatically retry

- Payments
- Refunds
- Delete Operations

---

# 16. Offline Feedback

Display

```
You're currently offline.

Changes will sync when your connection is restored.
```

Show synchronization status when reconnecting.

---

# 17. AI Feedback

Display

- AI Thinking
- AI Processing
- AI Completed
- AI Failed

Always identify AI-generated results.

---

# 18. Accessibility

All feedback components must support

- Screen Readers
- Keyboard Navigation
- ARIA Live Regions
- Focus Management

---

# 19. Responsive Behaviour

Feedback must work on

- Mobile
- Tablet
- Desktop
- POS Touch Screens

---

# 20. Performance

Feedback components should

- Render quickly
- Avoid blocking UI
- Not trigger unnecessary re-renders

---

# 21. Testing

Verify

- Empty States
- Loading States
- Toasts
- Confirmation Dialogs
- Offline Messages
- Accessibility
- Responsive Behaviour

---

# 22. Best Practices

- Tell users what happened.
- Explain why it happened.
- Offer the next action.
- Keep messages short.
- Use positive, human-friendly language.

---

# 23. Related Documents

- ERROR_HANDLING.md
- FORM_STANDARDS.md
- DASHBOARD_GUIDELINES.md
- DATA_TABLE_GUIDE.md
- ACCESSIBILITY_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
