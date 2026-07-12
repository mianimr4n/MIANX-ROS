# 🎁 LOYALTY PROGRAM

> Official customer loyalty and rewards program for the Telepizza Platform.

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Business Documentation |
| Document | LOYALTY_PROGRAM.md |
| Version | 1.0.0 |
| Status | Draft |
| Last Updated | 07 July 2026 |

---

# Purpose

⚠️ **Sequencing note:** A loyalty program needs order history to work — and Telepizza doesn't have digital order history yet (orders currently come by phone call). This document is reasonable to have as a *future design*, but building it before Phase 7 (Website) and real online orders exist would mean building reward logic with no real data to run on. Treat this as Phase 8+ work, not something to build alongside the website.

The Telepizza Loyalty Program is designed to increase customer retention, encourage repeat purchases, reward loyal customers, and provide personalized experiences through technology and AI.

---

# Objectives

- Increase repeat orders
- Improve customer satisfaction
- Reward loyal customers
- Encourage mobile app usage
- Increase average order value
- Strengthen long-term customer relationships

---

# Membership

Every registered customer automatically becomes a loyalty member.

Guest customers do not earn or redeem loyalty points.

---

# Membership Levels

## Bronze

Requirements

- New customers

Benefits

- Earn loyalty points
- Birthday offer
- Access to promotions

---

## Silver

⚠️ Threshold below is a placeholder example, not a decided value — pick real numbers based on Telepizza's actual order volume once available, not before.

Requirements

- 10 completed orders or qualifying annual spend *(illustrative — confirm real threshold later)*

Benefits

- Faster reward accumulation
- Exclusive monthly deals
- Priority promotional offers

---

## Gold

⚠️ Same caveat — placeholder threshold.

Requirements

- 25 completed orders or qualifying annual spend *(illustrative — confirm real threshold later)*

Benefits

- Premium offers
- Birthday rewards
- Free delivery promotions (where applicable)
- Early access to new menu items

---

## Platinum (Future)

Requirements

- Invitation or premium qualification

Benefits

- VIP customer support
- Exclusive campaigns
- Personalized rewards
- Premium experiences

---

# Loyalty Points

Customers earn points after completed orders.

Example earning model

- Every qualifying purchase earns points based on configurable business rules.

The exact conversion rate is configurable from the Admin Panel.

---

# Redeeming Points

Points can be redeemed for:

- Discounts
- Free products
- Combo upgrades
- Delivery discounts
- Exclusive rewards

---

# Reward Catalog

Examples

- Free Drink
- Free Fries
- Free Dessert
- Pizza Upgrade
- Delivery Voucher
- Discount Coupon

The reward catalog is managed by Head Office.

---

# Birthday Rewards

Eligible members receive:

- Birthday coupon
- Free product offer
- Special discount

Rules:

- Valid only during the configured promotion period.
- One birthday reward per year.

---

# Referral Program

Customers can invite friends.

When a referred customer completes a qualifying first order:

- Referrer receives reward points or a coupon.
- Referred customer receives a welcome offer.

Referral rules are configurable.

---

# Promotional Campaigns

Loyalty members may receive:

- Double points campaigns
- Weekend bonuses
- Seasonal rewards
- Festival promotions
- Student campaigns
- Branch-specific campaigns

---

# Point Expiry

Points may expire after a configurable period.

Examples:

- 12 months
- 18 months
- Never expire

Expiry policy is managed centrally.

---

# Loyalty Dashboard

Customers can view:

- Current points
- Membership level
- Reward history
- Available rewards
- Expiring points
- Referral status

---

# Admin Features

Head Office can:

- Configure earning rules
- Configure redemption rules
- Create reward campaigns
- Manage membership levels
- View loyalty analytics
- Export reports

---

# AI Opportunities

AI can:

- Recommend personalized rewards
- Predict customer churn
- Suggest re-engagement campaigns
- Recommend favorite menu items
- Optimize reward campaigns
- Identify high-value customers

---

# Business Rules

- Only completed orders earn points.
- Cancelled orders do not earn points.
- Refunded orders reverse awarded points.
- Expired points cannot be redeemed.
- Rewards are subject to campaign rules.
- Loyalty benefits are linked to the customer's registered account.

---

# Key Performance Indicators (KPIs)

- Repeat Customer Rate
- Loyalty Participation Rate
- Reward Redemption Rate
- Average Order Value
- Customer Lifetime Value
- Referral Conversion Rate
- Active Loyalty Members

---

# Implementation Impact

## Website

- Loyalty dashboard
- Reward redemption
- Referral page

## Mobile App

- Digital loyalty card
- Push notifications
- Reward wallet

## POS

- Loyalty lookup
- Reward redemption
- Points calculation

## Admin Panel

- Loyalty management
- Campaign creation
- Member analytics

## AI Platform

- Personalized offers
- Churn prediction
- Campaign optimization

---

# Related Database Tables

- customers
- loyalty_accounts
- loyalty_points
- loyalty_transactions
- rewards
- referrals
- campaigns
- coupons

---

# Related APIs

- POST /loyalty/earn
- POST /loyalty/redeem
- GET /loyalty/account
- GET /loyalty/rewards
- POST /referrals
- GET /campaigns

---

# Related AI Agents

- Customer Experience Agent
- Marketing Agent
- Sales Analytics Agent
- Loyalty Strategy Agent

---

# Related UI Screens

- Loyalty Dashboard
- Rewards Catalog
- Referral Program
- Customer Profile
- Admin Loyalty Panel

---

# Future Enhancements

- Digital Membership Card
- QR Code Rewards
- Family Accounts
- Subscription Membership
- Gamification
- Achievement Badges
- Tier Challenges
- Personalized Reward Marketplace

---

# Related Documents

- BUSINESS_MODEL.md
- PRICING_STRATEGY.md
- BUSINESS_RULES.md
- TARGET_AUDIENCE.md
- FRANCHISE_MODEL.md

---

© 2026 Telepizza Pakistan

Powered by Mianx.ai