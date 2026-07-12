# 🌐 API CLIENT GUIDE

> Official API Client Engineering Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Frontend Engineering |
| Document | API_CLIENT_GUIDE.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the standard API client architecture for all frontend applications.

Applies to:

- Website
- Admin Panel
- POS
- Kitchen Dashboard
- Customer Portal
- Franchise Portal

Objectives

- Centralized API Layer
- Type Safety
- Secure Authentication
- Consistent Error Handling
- Easy Testing
- Reusable Services

---

# 2. Technology Stack

HTTP Client

- Axios

Data Fetching

- TanStack Query

Validation

- Zod

Authentication

- JWT

---

# 3. Architecture

```
UI Component

↓

Feature Hook

↓

Service

↓

API Client

↓

Interceptor

↓

Backend API
```

Components should never call HTTP APIs directly.

---

# 4. Folder Structure

```text
lib/

api/

client.ts

config.ts

interceptors.ts

auth.ts

errors.ts

endpoints.ts

types.ts

services/

auth.service.ts

order.service.ts

customer.service.ts

inventory.service.ts
```

---

# 5. Base Configuration

Configure

- Base URL
- Timeout
- Headers
- Credentials
- Language
- Request ID

Example

```text
Base URL

/api/v1
```

---

# 6. Request Interceptor

Automatically add

- Authorization Token
- Branch ID
- Request ID
- Accept-Language

Never duplicate header logic in feature modules.

---

# 7. Response Interceptor

Handle

- Success Responses
- Error Responses
- Token Refresh
- Unauthorized Access
- Retry Logic

---

# 8. Authentication

Automatically attach JWT.

If access token expires:

```
Refresh Token

↓

Retry Request
```

If refresh fails:

- Logout user
- Clear session
- Redirect to Login

---

# 9. Error Handling

Map backend responses into consistent frontend errors.

Examples

- Validation Error
- Authentication Error
- Authorization Error
- Business Error
- Network Error
- Server Error

Never expose raw Axios errors to UI components.

---

# 10. Query Integration

Use TanStack Query.

Example

```
useOrders()

↓

order.service

↓

API Client
```

Benefits

- Caching
- Retry
- Background Refresh
- Invalidation

---

# 11. Mutations

Supported

- Create
- Update
- Delete
- Cancel
- Refund

After success

- Invalidate Queries
- Refresh Cache
- Show Toast

---

# 12. Retry Policy

Retry

- Network Failure
- HTTP 502
- HTTP 503
- HTTP 504

Do not retry

- Validation Errors
- Authentication Errors
- Authorization Errors

---

# 13. File Upload

Support

- Multipart Form Data
- Upload Progress
- Cancel Upload
- Retry Failed Upload

---

# 14. Download

Support

- CSV
- Excel
- PDF
- Images

Display download progress where applicable.

---

# 15. Timeout

Default timeout

```
30 Seconds
```

Long-running operations should use background processing instead of increasing timeouts.

---

# 16. Request Cancellation

Cancel requests when

- User leaves page
- Search input changes
- Duplicate requests occur

---

# 17. Offline Handling

Detect network loss.

Display

```
Offline Mode

Retry Connection
```

Queue actions only for supported offline workflows.

---

# 18. Logging

Log

- Request ID
- Endpoint
- Duration
- Status Code

Never log

- Passwords
- Tokens
- Sensitive Personal Data

---

# 19. Security

Protect against

- Token Leakage
- XSS
- CSRF (where applicable)
- Replay Attacks

Always use HTTPS in production.

---

# 20. Testing

Verify

- Request Interceptors
- Response Interceptors
- Token Refresh
- Error Mapping
- Retry Logic
- Uploads
- Downloads

---

# 21. Best Practices

- Use one shared API client.
- Keep business logic inside services.
- Never call Axios directly from components.
- Keep endpoints centralized.
- Use typed request and response models.

---

# 22. Related Documents

- API_SPECIFICATIONS.md
- API_ERROR_HANDLING.md
- FRONTEND_BLUEPRINT.md
- STATE_MANAGEMENT.md
- FORM_STANDARDS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
