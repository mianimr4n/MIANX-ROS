# 🚚 DELIVERY POLICY

> Official delivery policy for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Business Documentation |
| Document | DELIVERY_POLICY.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# Purpose

This document defines how deliveries are managed across all Telepizza Pakistan branches.

It establishes delivery standards, customer expectations, rider responsibilities, and operational rules.

---

# Delivery Objectives

- Fast delivery
- Safe food handling
- Accurate order delivery
- Real-time tracking
- Excellent customer experience

---

# Delivery Types

## Standard Delivery

Default home delivery service.

---

## Scheduled Delivery

Customers may choose a future delivery time.

---

## Express Delivery

Reserved for future implementation.

---

## Pickup

Customer collects the order from the selected branch.

---

# Delivery Coverage

Every branch has its own delivery area.

Examples:

- Royal Orchard
- Northern Bypass Road
- Nearby residential areas

Delivery coverage is configured by the Head Office or Branch Manager.

---

# Branch Assignment

Orders are assigned automatically based on:

1. Customer location
2. Delivery radius
3. Branch availability
4. Branch operating hours

If multiple branches qualify, the system selects the nearest available branch.

---

# Delivery Radius

Each branch can configure:

- Default delivery radius
- Extended delivery radius
- Special delivery zones

Orders outside the configured radius cannot be placed unless manually approved.

---

# Delivery Charges

📋 **Founder working assumption (Mianx.ai decision, 2026-07-10) — not yet validated with Telepizza's actual operations.** Confirm with real Telepizza ownership before this goes live.

Decided model for V1:

- **Flat-rate delivery fee** within the default radius — simplest to implement, easiest for customers to understand, matches how most Multan competitors (per `COMPETITOR_ANALYSIS.md`) appear to operate
- **Free delivery above a minimum order threshold** (exact Rs. amount TBD once real average-order-value data exists from the first weeks of live orders) — common promotional pattern, low cost to implement since it's just a checkout rule
- **Distance-based pricing deferred** — adds complexity (needs real-time distance calculation) that isn't justified until order volume is established

Default delivery radius (working assumption): **~5 km from Royal Orchard branch**, covering the immediate residential/commercial area. Adjust once real delivery-time data from actual orders shows where quality/speed holds up.

---

# Estimated Delivery Time

Estimated delivery time is calculated using:

- Kitchen preparation time
- Order queue
- Distance
- Traffic conditions (future)
- Rider availability

Customers see an estimated delivery time before checkout.

---

# Order Status Flow

Customer places order

↓

Payment verification

↓

Branch assignment

↓

Kitchen confirmation

↓

Preparing

↓

Ready for pickup

↓

Rider assigned

↓

Picked up

↓

Out for delivery

↓

Delivered

↓

Customer feedback

---

# Rider Assignment

A rider is assigned based on:

- Branch
- Availability
- Current workload
- Delivery location

One active rider can handle one active order at a time unless batching is enabled in a future release.

---

# Customer Notifications

Customers receive updates when:

- Order confirmed
- Food is being prepared
- Rider assigned
- Order picked up
- Rider nearby
- Order delivered

Notifications can be sent through:

- Mobile App
- SMS (optional)
- WhatsApp (future)
- Email (optional)

---

# Failed Delivery

Delivery may fail due to:

- Customer unavailable
- Incorrect address
- Payment issue
- Branch issue
- Rider issue

Every failed delivery must include a recorded reason.

---

# Delivery Cancellation

Customers may cancel only before kitchen preparation starts.

Once preparation begins, cancellation follows the refund policy.

Branch Managers can cancel orders in exceptional cases.

---

# Food Safety

Riders must:

- Deliver sealed packages.
- Handle food carefully.
- Follow hygiene standards.
- Use insulated delivery bags.

---

# Rider Responsibilities

- Accept assigned orders promptly.
- Deliver to the correct address.
- Maintain professional behavior.
- Confirm delivery completion.
- Report issues immediately.

---

# Customer Responsibilities

Customers should:

- Provide an accurate address.
- Keep their phone available.
- Be available to receive the order.
- Verify the order upon delivery.

---

# Delivery Performance KPIs

- Average delivery time
- On-time delivery rate
- Successful delivery rate
- Customer satisfaction
- Rider utilization
- Delivery cost per order

---

# AI Opportunities

AI can assist with:

- Smart rider assignment
- Delivery time prediction
- Route optimization
- Peak-hour forecasting
- Delivery performance analysis
- Delay alerts

---

# Business Rules

- Every delivery order belongs to one branch.
- Every delivery has one assigned rider.
- Every delivery has a complete status history.
- Every delivery completion requires confirmation.
- Delivery events are recorded for reporting and audits.

---

# Future Enhancements

- Live GPS tracking
- Customer live map
- Traffic-aware routing
- Multi-order rider batching
- AI delivery optimization
- Delivery heat maps

---

# Related Documents

- BUSINESS_RULES.md
- BRANCHES.md
- PRICING_STRATEGY.md
- REQUIREMENTS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai