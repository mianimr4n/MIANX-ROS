# 🏷 TEST NAMING CONVENTIONS

> Official Test Naming Standard for the Telepizza Platform

---

# Document Information

| Property     | Value                      |
| ------------ | -------------------------- |
| Project      | Telepizza Platform         |
| Module       | Testing Engineering        |
| Category     | Unit Testing               |
| Document     | TEST_NAMING_CONVENTIONS.md |
| Version      | 1.0.0                      |
| Status       | Enterprise Standard        |
| Last Updated | 07 July 2026               |

---

# 1. Purpose

This document defines the official naming conventions for all automated tests within the Telepizza Platform.

Consistent naming improves readability, maintainability, reporting, debugging, and AI-generated code quality.

---

# 2. Objectives

The naming convention provides

- Readability
- Consistency
- Better Test Reports
- Faster Debugging
- AI-Friendly Code Generation
- Enterprise Standards

---

# 3. Naming Principles

Every test name should

- Describe behavior
- Be readable
- Explain expected outcome
- Avoid implementation details
- Be deterministic

---

# 4. Standard Format

Preferred format

```
should<ExpectedBehavior>When<Condition>()
```

Examples

```
shouldCreateOrderWhenInputIsValid()

shouldRejectPaymentWhenCardExpired()

shouldReturnEmptyCartWhenNoItemsExist()

shouldCalculateTaxWhenCountryIsPakistan()
```

---

# 5. Alternative BDD Style

Use

```
Given

↓

When

↓

Then
```

Example

```
GivenValidOrder

WhenCheckoutIsRequested

ThenPaymentShouldSucceed
```

---

# 6. Negative Tests

Always describe failure

Examples

```
shouldThrowValidationException()

shouldRejectInvalidPassword()

shouldReturnUnauthorized()

shouldNotCreateDuplicateUser()
```

---

# 7. Edge Case Tests

Examples

```
shouldHandleEmptyCollection()

shouldHandleMaximumQuantity()

shouldHandleMinimumPrice()

shouldHandleNullInput()
```

---

# 8. Async Tests

Examples

```
shouldLoadOrdersAsync()

shouldRetryFailedRequest()

shouldCompleteWorkflowEventually()
```

---

# 9. API Tests

Examples

```
shouldReturn200WhenLoginSucceeds()

shouldReturn401ForInvalidToken()

shouldReturn404WhenOrderMissing()

shouldCreateCustomerSuccessfully()
```

---

# 10. UI Tests

Examples

```
shouldDisplayCheckoutPage()

shouldDisableSubmitButton()

shouldShowValidationMessage()

shouldNavigateToOrderHistory()
```

---

# 11. AI Tests

Examples

```
shouldGenerateValidPrompt()

shouldRetrieveRelevantKnowledge()

shouldSelectBestModel()

shouldRejectUnsafePrompt()
```

---

# 12. File Naming

Examples

```
order.service.test.ts

cart.service.test.ts

customer.controller.test.ts

discount.rules.test.ts

login.component.test.ts
```

---

# 13. Test Suite Naming

Example

```
describe("Order Service")

describe("Customer API")

describe("Discount Engine")

describe("Checkout Workflow")
```

---

# 14. Avoid

Do not use

```
test1()

test2()

works()

check()

validation()

abc()

newTest()

sample()
```

These names provide no business value.

---

# 15. Review Checklist

Verify

- Behavior is clear
- Expected result included
- Grammar is readable
- No abbreviations
- Consistent formatting

---

# 16. Best Practices

- Use business language.
- Keep names concise.
- Describe expected behavior.
- Keep naming consistent.
- Prefer behavior over implementation.

---

# 17. Related Documents

- UNIT_TESTING_STANDARD.md
- MOCKING_GUIDELINES.md
- TESTING_STRATEGY.md
- TEST_AUTOMATION.md

---

© 2026 Telepizza Platform

Powered by Mianx.ai
