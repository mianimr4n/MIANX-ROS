# ❌ API ERROR HANDLING

> Official API Error Handling Guide for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | API Engineering |
| Document | API_ERROR_HANDLING.md |
| Version | 1.0.0 |
| Status | Engineering |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the standard API error handling strategy for the Telepizza Platform.

Objectives:

- Consistent error responses
- Developer-friendly debugging
- Secure production errors
- Easy frontend integration
- AI-friendly API contracts

---

# 2. Error Response Format

Every API must return the same error format.

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed.",
  "errors": [],
  "requestId": "uuid",
  "timestamp": "2026-07-07T12:00:00Z",
  "path": "/api/v1/orders"
}
```

---

# 3. Success Response Format

```json
{
  "success": true,
  "message": "Order created successfully.",
  "data": {},
  "meta": {},
  "requestId": "uuid",
  "timestamp": "2026-07-07T12:00:00Z"
}
```

---

# 4. HTTP Status Codes

| Code | Description |
|------|-------------|
|200|OK|
|201|Created|
|204|No Content|
|400|Bad Request|
|401|Unauthorized|
|403|Forbidden|
|404|Not Found|
|409|Conflict|
|422|Validation Error|
|429|Too Many Requests|
|500|Internal Server Error|
|503|Service Unavailable|

---

# 5. Validation Errors

Example

```json
{
  "success": false,
  "statusCode": 422,
  "error": "Validation Error",
  "message": "Validation failed.",
  "errors": [
    {
      "field": "email",
      "message": "Email is required."
    }
  ]
}
```

---

# 6. Authentication Errors

```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Authentication required."
}
```

---

# 7. Authorization Errors

```json
{
  "success": false,
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not have permission to perform this action."
}
```

---

# 8. Resource Not Found

```json
{
  "success": false,
  "statusCode": 404,
  "error": "Not Found",
  "message": "Order not found."
}
```

---

# 9. Conflict Errors

Examples:

- Duplicate email
- Duplicate phone
- Duplicate SKU
- Duplicate order number

```json
{
  "success": false,
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already exists."
}
```

---

# 10. Business Rule Errors

Examples:

- Insufficient stock
- Restaurant closed
- Coupon expired
- Payment already processed

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Business Rule",
  "message": "Insufficient inventory."
}
```

---

# 11. Internal Server Errors

Never expose:

- SQL queries
- Stack traces
- Passwords
- Tokens
- Internal file paths

Production response

```json
{
  "success": false,
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred."
}
```

---

# 12. Logging

Every error log should include:

- Request ID
- User ID
- Branch ID
- Endpoint
- HTTP Method
- Timestamp
- Stack Trace (Internal Only)

---

# 13. Exception Handling

Use a global NestJS exception filter.

Responsibilities:

- Standardize responses
- Log errors
- Hide sensitive information
- Attach request ID

---

# 14. Error Categories

Validation

Authentication

Authorization

Business

Database

External API

AI Provider

Infrastructure

Unknown

---

# 15. Database Errors

Handle:

- Foreign Key violations
- Unique constraints
- Transaction failures
- Connection timeouts

Return user-friendly messages.

---

# 16. External Service Errors

Examples:

- Payment Gateway
- SMS Provider
- Email Provider
- AI Provider

Response

```json
{
  "success": false,
  "statusCode": 503,
  "error": "External Service",
  "message": "Payment service is temporarily unavailable."
}
```

---

# 17. AI Errors

Examples:

- Provider timeout
- Token limit exceeded
- Model unavailable
- Prompt validation failed

Never expose provider secrets.

---

# 18. Best Practices

- Always return JSON
- Include requestId
- Log detailed errors internally
- Return safe messages to clients
- Use consistent HTTP status codes

---

# 19. Related Documents

- API_SPECIFICATIONS.md
- API_VERSIONING.md
- WEBHOOK_SPECIFICATIONS.md
- SECURITY_ARCHITECTURE.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai
