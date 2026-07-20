# 📊 DATA TABLE GUIDE

> Official Data Table Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | DATA_TABLE_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official standards for all data tables used throughout the Telepizza Platform.

Applies to:

- Admin Panel
- POS
- Kitchen Dashboard
- Customer Portal
- Franchise Portal
- AI Dashboard

Objectives

- Consistent User Experience
- High Performance
- Accessibility
- Reusable Components
- Enterprise Standards

---

# 2. Technology Stack

Table Engine

- TanStack Table

Virtualization

- TanStack Virtual

Export

- CSV
- Excel
- PDF

---

# 3. Table Architecture

```
Backend API

↓

TanStack Query

↓

Table Hook

↓

Table Component

↓

User
```

---

# 4. Standard Layout

Every table should include:

```
Page Title

↓

Toolbar

↓

Filters

↓

Data Table

↓

Pagination
```

---

# 5. Toolbar

Toolbar may include

- Search
- Filter
- Export
- Import
- Refresh
- Bulk Actions
- Column Settings

---

# 6. Columns

Every column should define

- Header
- Accessor
- Width
- Alignment
- Sortable
- Filterable
- Visibility
- Formatter

---

# 7. Sorting

Support

- Ascending
- Descending
- Multi-column (future)

Default sorting should be defined per module.

---

# 8. Filtering

Support

- Search
- Status
- Branch
- Category
- Employee
- Customer
- Date Range
- Price Range

Filters should be combinable.

---

# 9. Global Search

Search should support

- Debouncing
- Server-side search
- Highlighted matches (future)

---

# 10. Pagination

Default page size

```
20
```

Options

```
10

20

50

100
```

Large datasets should use server-side pagination.

---

# 11. Row Selection

Support

- Single Select
- Multi Select
- Select Current Page
- Select All Results (where supported)

---

# 12. Bulk Actions

Examples

- Delete
- Export
- Print
- Assign
- Archive
- Update Status

Confirmation is required for destructive actions.

---

# 13. Row Actions

Standard actions

- View
- Edit
- Duplicate
- Print
- Delete

Permission checks must be enforced.

---

# 14. Status Badges

Use semantic colors.

Examples

```
Pending

Completed

Cancelled

Active

Inactive
```

Never rely on color alone; include text labels.

---

# 15. Empty State

Display

- Illustration/Icon
- Friendly Message
- Action Button

Example

```
No orders found.

Create your first order.
```

---

# 16. Loading State

Use

- Skeleton Rows
- Spinner
- Progress Indicator

Avoid blank tables.

---

# 17. Error State

Display

- Error Message
- Retry Button

Log technical details internally only.

---

# 18. Export

Support

- CSV
- Excel
- PDF

Respect:

- Active filters
- Sorting
- User permissions

---

# 19. Responsive Behaviour

Desktop

- Full table

Tablet

- Reduced columns

Mobile

- Responsive cards or horizontal scroll when necessary

POS

- Large touch targets
- Simplified layout

---

# 20. Accessibility

Every table must support

- Keyboard Navigation
- Focus Indicators
- ARIA Roles
- Screen Reader Support
- WCAG 2.2 AA

---

# 21. Performance

Recommendations

- Server-side pagination
- Virtual scrolling
- Lazy loading
- Memoized columns
- Cached queries

Avoid rendering thousands of rows at once.

---

# 22. Security

Respect

- User Roles
- Permissions
- Branch Access

Hide unauthorized actions instead of relying only on backend rejection.

---

# 23. AI Integration

Future AI features

- Smart Search
- AI Filters
- AI Insights
- Natural Language Queries
- Auto-generated Reports

---

# 24. Testing

Test

- Sorting
- Filtering
- Pagination
- Export
- Bulk Actions
- Accessibility
- Responsive Layout

---

# 25. Standard Table Features

Every enterprise table should support:

- Search
- Sorting
- Filtering
- Pagination
- Export
- Refresh
- Column Visibility
- Row Selection
- Bulk Actions
- Loading State
- Empty State
- Error State

---

# 26. Related Documents

- UI_COMPONENT_GUIDE.md
- DESIGN_SYSTEM.md
- FORM_STANDARDS.md
- STATE_MANAGEMENT.md
- API_CLIENT_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
