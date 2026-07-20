# 🔗 DEEP LINKING

> Official Deep Linking & Universal Linking Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Mobile Engineering |
| Document | DEEP_LINKING.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the official deep linking architecture for all Telepizza mobile applications.

Applies to

- Customer App
- Rider App
- Manager App
- Franchise App
- AI Assistant App

Objectives

- Consistent Navigation
- Secure Deep Links
- Universal Links
- App Links
- Marketing Integration
- Push Notification Integration

---

# 2. Deep Linking Architecture

```
QR Code

↓

SMS

↓

Email

↓

Push Notification

↓

Universal Link

↓

App Router

↓

Target Screen
```

Every deep link should resolve through a centralized routing layer.

---

# 3. Supported Link Types

- Universal Links (iOS)
- Android App Links
- Custom URI Scheme
- QR Codes
- Push Notification Links
- Email Campaign Links
- Marketing Campaign Links

---

# 4. URL Structure

Format

```
telepizza://orders/{id}

telepizza://cart

telepizza://profile

telepizza://offers

telepizza://track/{orderId}
```

Universal Link Example

```
https://app.telepizza.com/orders/12345
```

---

# 5. Navigation Rules

A deep link may open

- Login
- Home
- Product
- Category
- Cart
- Checkout
- Order Details
- Order Tracking
- Profile
- Notifications
- AI Assistant

Unknown routes must redirect to a safe fallback screen.

---

# 6. Authentication Rules

Protected routes

- Orders
- Payments
- Profile
- Loyalty
- Manager Dashboard

If the user is not authenticated

```
Deep Link

↓

Login

↓

Original Destination
```

---

# 7. Authorization Rules

Validate

- User Role
- Branch Access
- Organization Access
- Feature Flags

Never rely only on client-side validation.

---

# 8. Push Notification Integration

Notifications should include

- Route
- Entity ID
- Metadata

Example

```
notification

↓

order.completed

↓

/orders/123
```

---

# 9. QR Code Integration

Supported

- Table Ordering
- Promotions
- Coupons
- Store Locations
- Campaigns
- Feedback

Validate every QR payload before navigation.

---

# 10. Marketing Campaigns

Examples

```
Summer Offer

↓

Landing Page

↓

Coupon Applied

↓

Checkout
```

Campaign parameters should be tracked for analytics.

---

# 11. Analytics

Track

- Link Opened
- Link Source
- Conversion
- Failed Links
- Redirects
- Campaign Performance

---

# 12. Security

Validate

- Origin
- Route
- Parameters
- Authentication
- Authorization

Reject malformed or unauthorized links.

---

# 13. Offline Behaviour

If offline

- Queue navigation where practical
- Display cached content
- Retry loading when online

---

# 14. Error Handling

Handle

- Invalid Route
- Expired Link
- Missing Resource
- Unauthorized Access

Display user-friendly error messages.

---

# 15. Testing

Verify

- Universal Links
- Android App Links
- Custom URI
- Push Notifications
- QR Codes
- Authentication Redirects
- Offline Behaviour

---

# 16. Best Practices

- Centralize routing.
- Validate every deep link.
- Support deferred navigation.
- Keep URLs human-readable.
- Never expose sensitive identifiers unnecessarily.

---

# 17. Related Documents

- MOBILE_API_GUIDE.md
- PUSH_NOTIFICATION_GUIDE.md
- MOBILE_SECURITY.md
- FEATURE_FLAGS_AND_REMOTE_CONFIG.md
- APP_RELEASE_GUIDE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
