# 💰 PRICING STRATEGY

> Official pricing strategy for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Business Documentation |
| Document | PRICING_STRATEGY.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# Purpose

This document defines how product prices, discounts, promotions, taxes, and delivery charges are managed across the Telepizza Platform.

---

# Pricing Objectives

- Transparent pricing
- Consistent pricing across branches
- Flexible promotional campaigns
- Easy price management
- Support future expansion

---

# Product Pricing

Each product includes:

- Base Price
- Sale Price (Optional)
- Cost Price (Internal)
- Tax Category
- Availability Status

⚠️ **Important: the prices below are illustrative placeholders only, not confirmed Telepizza prices.** An earlier draft presented specific numbers (Rs. 1,299, Rs. 2,199, Rs. 699) as if they were real — they were not sourced from Telepizza and should not be treated as fact. Research found one real data point: a bundle deal observed at **Rs. 1,899** (via a food vlogger's post), and a general price tier of roughly **Rs. 1,000–2,000 per person**. Everything else needs to come directly from Telepizza before this table is real:

| Product | Base Price | Sale Price |
|----------|-----------:|-----------:|
| Small Pizza | *TBD — confirm with Telepizza* | *TBD* |
| Large Pizza | *TBD — confirm with Telepizza* | *TBD* |
| Zinger Burger | *TBD — confirm with Telepizza* | *TBD* |
| (Reference) Bundle deal | Rs. 1,899 *(one verified data point, may not be current)* | — |

**Do not publish or quote specific prices to Telepizza or customers until this table is filled with real, confirmed numbers.**

---

# Add-On Pricing

Optional add-ons may have separate prices.

Examples:

- Extra Cheese
- Stuffed Crust
- Extra Chicken
- Extra Sauce
- Soft Drink Upgrade

Each add-on has its own configurable price.

---

# Combo Pricing

Combo meals have fixed package pricing.

Examples:

- Pizza + Drink
- Family Deal
- Student Deal
- Party Deal

The combo price may be lower than buying items separately.

---

# Branch Pricing

Default pricing is managed centrally.

Branch managers may request local pricing changes, subject to Head Office approval.

---

# Discount Types

Supported discounts include:

- Percentage Discount
- Fixed Amount Discount
- Buy One Get One (Future)
- Free Item Promotion
- Student Discount
- Corporate Discount

---

# Coupon Strategy

Coupons can be configured with:

- Coupon Code
- Discount Type
- Discount Value
- Start Date
- Expiry Date
- Minimum Order
- Maximum Discount
- Usage Limit
- Eligible Products
- Eligible Branches

Examples:

WELCOME10

STUDENT15

PIZZAFRIDAY

---

# Happy Hour Pricing

Future support for time-based pricing.

Example:

Monday – Thursday

2:00 PM – 5:00 PM

20% Discount

---

# Seasonal Campaigns

Special pricing during:

- Ramadan
- Eid
- Independence Day
- New Year
- Cricket Events
- Back-to-School

---

# Delivery Charges

Delivery charges are configurable.

Possible models:

- Flat Rate
- Distance Based
- Free Delivery Above Minimum Order
- Promotional Free Delivery

---

# Tax Rules

Every order may include:

- Sales Tax
- Service Charges (Optional)

Tax rules are configurable according to local regulations.

---

# Refund Pricing

Refund calculations are based on:

- Amount Paid
- Applied Discounts
- Coupons
- Taxes
- Delivery Charges

Refund rules follow the official refund policy.

---

# Price Approval Workflow

Price Change Request

↓

Branch Manager

↓

Head Office Review

↓

Approval

↓

Published

↓

Available on Website & Mobile App

---

# AI Pricing Opportunities

Future AI features include:

- Demand Forecasting
- Promotion Suggestions
- Best Seller Analysis
- Price Sensitivity Analysis
- Seasonal Pricing Recommendations

AI recommendations require human approval before publication.

---

# Key Performance Indicators

- Average Order Value
- Discount Utilization
- Coupon Redemption Rate
- Revenue per Customer
- Gross Profit Margin
- Promotion ROI

---

# Business Rules

- Every product must have a valid price.
- Sale price cannot exceed base price.
- Expired promotions are automatically disabled.
- Coupons cannot be combined unless explicitly allowed.
- Price changes are recorded in the audit log.

---

# Implementation Impact

## Website

- Display prices and promotions
- Apply coupons during checkout

## Mobile App

- Show active offers
- Display loyalty discounts

## POS

- Apply discounts
- Process promotional pricing

## Admin Panel

- Manage pricing
- Create campaigns
- Approve price changes

## AI Platform

- Recommend promotions
- Analyze pricing trends

---

# Related Database Tables

- products
- product_prices
- product_addons
- promotions
- coupons
- orders
- order_items
- payments

---

# Related APIs

- GET /products
- GET /promotions
- POST /coupons/validate
- POST /checkout
- PATCH /products/{id}/price

---

# Related AI Agents

- Pricing Strategy Agent
- Sales Analytics Agent
- Marketing Agent
- Executive Reporting Agent

---

# Related UI Screens

- Product Detail
- Menu
- Cart
- Checkout
- Promotions
- Admin Pricing Dashboard

---

# Future Enhancements

- Dynamic Pricing
- AI-assisted Campaign Planning
- Branch-specific Promotions
- Personalized Discounts
- Membership Pricing
- Subscription Meal Plans

---

# Related Documents

- BUSINESS_RULES.md
- DELIVERY_POLICY.md
- LOYALTY_PROGRAM.md
- REQUIREMENTS.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai