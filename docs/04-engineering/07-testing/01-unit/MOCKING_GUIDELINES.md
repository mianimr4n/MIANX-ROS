# 🎭 MOCKING GUIDELINES

> Official Mocking & Test Double Standard for the Telepizza Platform

---

# Document Information

| Property     | Value                 |
| ------------ | --------------------- |
| Project      | Telepizza Platform    |
| Module       | Testing Engineering   |
| Category     | Unit Testing          |
| Document     | MOCKING_GUIDELINES.md |
| Version      | 1.0.0                 |
| Status       | Enterprise Standard   |
| Last Updated | 07 July 2026          |

---

# 1. Purpose

This document defines the official standards for using mocks, stubs, fakes, spies, and other test doubles throughout the Telepizza Platform.

Proper dependency isolation ensures unit tests remain fast, deterministic, maintainable, and independent of external systems.

---

# 2. Objectives

The Mocking Standard provides

- Dependency Isolation
- Faster Tests
- Reliable Test Execution
- Repeatable Results
- External Service Simulation
- Enterprise Consistency

---

# 3. Test Double Types

Supported test doubles

- Mock
- Stub
- Fake
- Spy
- Dummy

Each serves a different purpose.

---

# 4. Definitions

## Mock

Verifies interactions with dependencies.

Example

- Verify Payment Service was called.

---

## Stub

Returns predefined responses.

Example

- Return predefined customer profile.

---

## Fake

Lightweight working implementation.

Example

- In-memory database.

---

## Spy

Records method calls.

Example

- Count notification requests.

---

## Dummy

Placeholder object that satisfies dependencies but is never used.

---

# 5. What Should Be Mocked

Mock

- External APIs
- Database Connections
- File Storage
- Email Services
- SMS Services
- Payment Gateways
- Push Notifications
- Cache Servers
- Authentication Providers
- Time Sources
- Random Number Generators

---

# 6. What Should NOT Be Mocked

Avoid mocking

- Business Rules
- Domain Logic
- Validation Logic
- Calculations
- Pricing Rules
- Tax Rules

These must be tested directly.

---

# 7. Mock Architecture

```
Production Code

↓

Dependency

↓

Mock

↓

Unit Test
```

Dependencies are replaced only within the test environment.

---

# 8. API Mocking

API mocks should provide

- Success Responses
- Client Errors
- Server Errors
- Timeout Simulation
- Retry Scenarios

---

# 9. Database Mocking

Preferred order

1. Repository Mock
2. In-Memory Database
3. Test Database

Production databases must never be used in unit tests.

---

# 10. Time Mocking

Mock

- Current Time
- Time Zones
- Expiration Dates
- Scheduling

Tests must never depend on the system clock.

---

# 11. Random Data

Random generators should be mocked.

Prefer deterministic values to ensure repeatable results.

---

# 12. Mock Data

Use

- Builders
- Factories
- Fixtures

Avoid hardcoded duplicate objects.

---

# 13. Mock Factories

Every major domain should provide reusable factories.

Examples

```
CustomerFactory

OrderFactory

ProductFactory

InventoryFactory

PaymentFactory
```

Factories reduce duplication and improve consistency.

---

# 14. Mock Naming

Examples

```
mockPaymentGateway

mockCustomerRepository

mockNotificationService

fakeInventoryStore

spyEmailSender
```

Names should clearly indicate the test double type.

---

# 15. Error Simulation

Every mocked dependency should support

- Timeout
- Exception
- Invalid Data
- Unauthorized Access
- Network Failure

Failure scenarios are as important as success scenarios.

---

# 16. Test Isolation

Each test must

- Create its own mocks
- Reset state after execution
- Avoid shared mutable objects

Tests must run independently and in parallel.

---

# 17. Anti-Patterns

Avoid

- Mocking business logic
- Deep mock chains
- Shared global mocks
- Environment-dependent mocks
- Mocking every dependency without need
- Copy-paste mock definitions

---

# 18. AI Coding Guidelines

AI-generated tests should

- Prefer factories over inline objects.
- Mock only external dependencies.
- Keep mocks reusable.
- Avoid unnecessary expectations.
- Reset all mocks between tests.

---

# 19. Review Checklist

Verify

- Correct test double selected
- Business logic not mocked
- Mocks reset after execution
- Error scenarios included
- Mock names follow standards

---

# 20. Best Practices

- Mock external systems only.
- Keep mocks simple.
- Prefer reusable factories.
- Test failure paths.
- Minimize mock complexity.
- Review mocks during code reviews.

---

# 21. Related Documents

- UNIT_TESTING_STANDARD.md
- TEST_NAMING_CONVENTIONS.md
- INTEGRATION_TESTING.md
- API_TESTING_STANDARD.md
- TEST_AUTOMATION.md

---

© 2026 Telepizza Platform

Powered by Mianx.ai
