# ♿ ACCESSIBILITY GUIDE

> Official Accessibility Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | ACCESSIBILITY_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the accessibility standards for every Telepizza application.

Applies to:

- Website
- Admin Panel
- POS
- Kitchen Dashboard
- Customer Portal
- Franchise Portal
- AI Dashboard

Objectives

- WCAG 2.2 AA Compliance
- Keyboard Accessibility
- Screen Reader Support
- Inclusive Design
- Better Usability

---

# 2. Accessibility Principles

Follow the POUR principles.

Perceivable

↓

Operable

↓

Understandable

↓

Robust

---

# 3. Compliance Target

Minimum standard

```
WCAG 2.2 AA
```

Accessibility should be considered during design, development and testing.

---

# 4. Semantic HTML

Use semantic elements whenever possible.

Examples

```
<header>

<nav>

<main>

<section>

<article>

<footer>

<button>

<form>

<label>
```

Avoid using generic `<div>` elements where semantic elements are appropriate.

---

# 5. Keyboard Navigation

Every interactive component must be usable without a mouse.

Support

- Tab
- Shift + Tab
- Enter
- Space
- Escape
- Arrow Keys

Keyboard users must be able to complete every workflow.

---

# 6. Focus Management

Requirements

- Visible focus indicator
- Logical tab order
- Return focus after closing dialogs
- Trap focus inside modal dialogs

Never remove focus outlines without providing an accessible alternative.

---

# 7. Screen Reader Support

Every control must have an accessible name.

Examples

- Labels
- aria-label
- aria-labelledby
- aria-describedby

Icons that convey meaning should have accessible labels.

---

# 8. Forms

Every form field requires

- Label
- Required indicator
- Error message
- Helper text (where needed)

Validation errors should be announced to assistive technologies.

---

# 9. Buttons

Buttons must:

- Have descriptive text
- Show focus state
- Have sufficient touch area
- Support keyboard activation

Avoid icon-only buttons unless an accessible label is provided.

---

# 10. Links

Links should clearly describe their destination.

Good

```
View Order Details
```

Avoid

```
Click Here
```

---

# 11. Images

Decorative images

```
alt=""
```

Informative images

```
Meaningful alt text
```

Charts and diagrams should include text summaries where appropriate.

---

# 12. Tables

Tables must support

- Header cells
- Row headers (when applicable)
- Captions
- Keyboard navigation

Complex tables should remain understandable with screen readers.

---

# 13. Color & Contrast

Minimum contrast ratio

Normal text

```
4.5 : 1
```

Large text

```
3 : 1
```

Never use color alone to communicate information.

Example

```
✔ Success

✖ Error
```

---

# 14. Error Messages

Errors should

- Explain the problem
- Identify the affected field
- Suggest corrective action

Example

```
Email address is required.
```

---

# 15. Motion & Animation

Respect user preferences.

Support

```
prefers-reduced-motion
```

Reduce or disable non-essential animations.

---

# 16. Responsive Accessibility

Support

- Mobile
- Tablet
- Desktop
- POS Touch Screens

Interactive controls must remain easy to reach and operate.

---

# 17. Touch Targets

Minimum recommended touch target

```
44 × 44 px
```

Buttons and controls should be spaced to prevent accidental taps.

---

# 18. Dialogs

Dialogs must

- Trap keyboard focus
- Close with Escape
- Restore focus to the triggering element
- Include a descriptive title

---

# 19. Notifications

Toast and alert messages should be announced using appropriate ARIA live regions.

Critical alerts should receive immediate attention without disrupting keyboard navigation.

---

# 20. AI Components

AI interfaces should provide

- Accessible chat history
- Keyboard-friendly input
- Screen reader announcements for new AI responses
- Clear indication when AI is generating a response

---

# 21. Accessibility Testing

Test with

- Keyboard only
- Screen reader
- Color contrast checker
- Browser accessibility tools
- Automated accessibility testing

Recommended tools

- Lighthouse
- axe DevTools
- WAVE
- NVDA
- VoiceOver

---

# 22. Accessibility Checklist

Before release verify

- Semantic HTML
- Keyboard navigation
- Focus management
- Labels
- Contrast
- Error messages
- Responsive behavior
- Screen reader compatibility
- Reduced motion support

---

# 23. Best Practices

- Accessibility is part of development, not an afterthought.
- Test with real keyboard navigation.
- Use semantic HTML first.
- Prefer native controls where possible.
- Keep interfaces simple and predictable.

---

# 24. Related Documents

- DESIGN_SYSTEM.md
- DESIGN_TOKENS.md
- UI_COMPONENT_GUIDE.md
- FORM_STANDARDS.md
- DATA_TABLE_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
