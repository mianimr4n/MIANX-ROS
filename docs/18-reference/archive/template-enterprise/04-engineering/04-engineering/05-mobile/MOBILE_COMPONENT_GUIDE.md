# 📦 MOBILE COMPONENT GUIDE

> Official Mobile UI Component Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Engineering |
| Document | MOBILE_COMPONENT_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official reusable mobile UI components used across all Telepizza mobile applications.

Applies to

- Customer App
- Rider App
- Manager App
- Franchise App
- AI Assistant App

Objectives

- Component Reusability
- Consistent User Experience
- Faster Development
- Accessibility
- Enterprise Scalability

---

# 2. Component Philosophy

Every component should be

- Reusable
- Configurable
- Accessible
- Theme Aware
- Testable
- Performance Optimized

Business logic should never exist inside UI components.

---

# 3. Component Architecture

```
Primitive Components

↓

Shared Components

↓

Feature Components

↓

Screens

↓

Applications
```

---

# 4. Folder Structure

```text
components/

ui/

Button/

Input/

Card/

Avatar/

Badge/

Chip/

Divider/

Icon/

Loader/

layout/

Header/

Footer/

Container/

SafeArea/

navigation/

BottomTabs/

TopBar/

Drawer/

components/

OrderCard/

ProductCard/

CustomerCard/

RiderCard/

AIResponseCard/

feedback/

Toast/

Snackbar/

Alert/

Dialog/

BottomSheet/

EmptyState/

Loading/

forms/

TextField/

PasswordField/

OTPInput/

SearchInput/

Select/

Checkbox/

Radio/

Switch/

DatePicker/

TimePicker/

media/

Image/

Avatar/

Camera/

QRCodeScanner/

FilePicker/

charts/

LineChart/

BarChart/

PieChart/

KpiCard/

ai/

ChatBubble/

PromptInput/

TypingIndicator/

SuggestionCard/
```

---

# 5. Button Component

Variants

- Primary
- Secondary
- Outline
- Ghost
- Danger
- Icon

States

- Default
- Pressed
- Disabled
- Loading

---

# 6. Input Components

Support

- Text
- Email
- Password
- Phone
- Search
- Number
- OTP
- Textarea

Every input must include

- Label
- Placeholder
- Validation
- Error Message
- Helper Text

---

# 7. Card Components

Reusable cards

- Product Card
- Order Card
- Customer Card
- Rider Card
- Report Card
- AI Insight Card

Cards should support loading and skeleton states.

---

# 8. List Components

Support

- Flat List
- Section List
- Infinite Scroll
- Pull to Refresh

Provide empty and loading states.

---

# 9. Navigation Components

Include

- Top App Bar
- Bottom Navigation
- Drawer
- Breadcrumb (where applicable)
- Floating Action Button

---

# 10. Feedback Components

Support

- Toast
- Snackbar
- Dialog
- Confirmation Modal
- Bottom Sheet
- Skeleton Loader
- Progress Indicator

---

# 11. Form Components

Reusable controls

- TextField
- PasswordField
- SearchField
- OTPInput
- DatePicker
- Select
- Checkbox
- Switch
- Radio

Integrate with React Hook Form.

---

# 12. Media Components

Support

- Image Viewer
- Avatar
- Camera Preview
- QR Scanner
- Barcode Scanner
- File Picker

Optimize media rendering.

---

# 13. AI Components

Reusable AI UI

- Chat Bubble
- Prompt Input
- Suggested Prompt
- AI Loading
- AI Response Card
- AI Error State

Clearly distinguish AI-generated content.

---

# 14. Chart Components

Support

- Line Chart
- Bar Chart
- Pie Chart
- KPI Card

Follow CHART_STANDARDS.md.

---

# 15. Theme Support

Every component must support

- Light Theme
- Dark Theme
- System Theme

Use design tokens instead of hardcoded values.

---

# 16. Accessibility

Components must support

- Screen Readers
- Keyboard Navigation (where applicable)
- Voice Control
- Dynamic Font Sizes
- Touch Targets (≥ 44 × 44 px)

---

# 17. Performance

Recommendations

- Memoize components where appropriate
- Lazy load heavy components
- Optimize images
- Avoid unnecessary re-renders

---

# 18. Testing

Each component should include

- Unit Tests
- Accessibility Tests
- Snapshot Tests (where useful)
- Visual Regression Tests (future)

---

# 19. Naming Convention

Folders

```text
Button/

OrderCard/

BottomSheet/
```

Files

```text
Button.tsx

Button.types.ts

Button.styles.ts

Button.test.tsx

index.ts
```

---

# 20. Component API Design

Components should expose

- Props Interface
- Default Values
- Variant Support
- Event Callbacks
- Theme Support

Avoid large prop lists by grouping related options.

---

# 21. Best Practices

- Build once, reuse everywhere.
- Keep components small.
- Separate presentation from logic.
- Document every public component.
- Prefer composition over inheritance.

---

# 22. Related Documents

- MOBILE_DESIGN_SYSTEM.md
- MOBILE_FOLDER_STRUCTURE.md
- MOBILE_BLUEPRINT.md
- ACCESSIBILITY_GUIDE.md
- THEME_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
