# 📊 Metric Catalog

> Enterprise Business Metrics Catalog for the Analytics Department

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Department | Analytics Team |
| Document | METRIC_CATALOG.md |
| Version | 1.0 |
| Status | Enterprise Ready |
| Classification | Enterprise Metric Catalog |

---

# Purpose

This document defines all enterprise business metrics used across the Telepizza Platform.

It provides standardized metric definitions, formulas, owners, update frequencies and business purposes.

Every AI Employee must use these standard metrics.

---

# Metric Categories

- Sales Metrics
- Customer Metrics
- Marketing Metrics
- Operations Metrics
- Delivery Metrics
- Financial Metrics
- Inventory Metrics
- Employee Metrics
- Executive Metrics

---

# Sales Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Total Revenue | Sum(Order Amount) | PKR | AI Sales Analyst | Real-time |
| Total Orders | Count(Orders) | Orders | AI Sales Analyst | Real-time |
| Average Order Value (AOV) | Revenue ÷ Orders | PKR | AI Sales Analyst | Real-time |
| Sales Growth | (Current - Previous) ÷ Previous ×100 | % | AI Sales Analyst | Daily |
| Orders Per Hour | Orders ÷ Hours | Orders | AI Sales Analyst | Hourly |

---

# Customer Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| New Customers | Count(New Customers) | Customers | AI Customer Analyst | Daily |
| Returning Customers | Count(Returning Customers) | Customers | AI Customer Analyst | Daily |
| Customer Retention Rate | Returning ÷ Total ×100 | % | AI Customer Analyst | Monthly |
| Customer Churn Rate | Lost ÷ Total ×100 | % | AI Customer Analyst | Monthly |
| Customer Lifetime Value (CLV) | Total Revenue ÷ Customers | PKR | AI Customer Analyst | Monthly |
| Net Promoter Score (NPS) | Standard NPS Formula | Score | AI Customer Analyst | Monthly |

---

# Marketing Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Campaign ROI | (Revenue-Cost) ÷ Cost ×100 | % | AI Marketing Analyst | Daily |
| ROAS | Revenue ÷ Ad Spend | Ratio | AI Marketing Analyst | Daily |
| Conversion Rate | Orders ÷ Visitors ×100 | % | AI Marketing Analyst | Daily |
| Click Through Rate | Clicks ÷ Impressions ×100 | % | AI Marketing Analyst | Daily |
| Cost Per Acquisition | Spend ÷ Customers | PKR | AI Marketing Analyst | Daily |

---

# Operations Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Kitchen Efficiency | Completed ÷ Received ×100 | % | AI Operations Analyst | Hourly |
| Order Preparation Time | Avg(Preparation Time) | Minutes | AI Operations Analyst | Real-time |
| Food Waste | Waste ÷ Production ×100 | % | AI Operations Analyst | Daily |
| SOP Compliance | Compliant ÷ Total ×100 | % | AI Operations Analyst | Weekly |

---

# Delivery Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Average Delivery Time | Avg(Delivery Time) | Minutes | AI Delivery Analyst | Real-time |
| On-Time Delivery Rate | On-Time ÷ Total ×100 | % | AI Delivery Analyst | Daily |
| Delivery Success Rate | Successful ÷ Total ×100 | % | AI Delivery Analyst | Daily |
| Cost Per Delivery | Delivery Cost ÷ Deliveries | PKR | AI Delivery Analyst | Daily |

---

# Financial Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Gross Profit | Revenue - COGS | PKR | AI Financial Analyst | Daily |
| Net Profit | Revenue - Expenses | PKR | AI Financial Analyst | Daily |
| Gross Margin | Gross Profit ÷ Revenue ×100 | % | AI Financial Analyst | Daily |
| Net Margin | Net Profit ÷ Revenue ×100 | % | AI Financial Analyst | Daily |
| Cash Flow | Inflow - Outflow | PKR | AI Financial Analyst | Daily |

---

# Inventory Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Inventory Turnover | Usage ÷ Average Inventory | Ratio | AI Operations Analyst | Weekly |
| Stock Availability | Available ÷ Required ×100 | % | AI Operations Analyst | Real-time |
| Stock Out Rate | Stock Outs ÷ Products ×100 | % | AI Operations Analyst | Daily |

---

# Employee Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Staff Productivity | Orders ÷ Staff | Ratio | AI Operations Analyst | Daily |
| Attendance Rate | Present ÷ Total ×100 | % | AI Operations Analyst | Daily |
| Training Completion | Completed ÷ Assigned ×100 | % | AI Operations Analyst | Monthly |

---

# Executive Metrics

| Metric | Formula | Unit | Owner | Frequency |
|---------|----------|------|---------|-----------|
| Business Health Score | Composite KPI Score | Score | AI Executive Dashboard Manager | Real-time |
| Forecast Accuracy | Correct ÷ Total ×100 | % | AI Predictive Analytics Engine | Weekly |
| KPI Achievement Rate | Achieved ÷ Total ×100 | % | AI KPI Manager | Weekly |
| Data Quality Score | Quality Rules Passed | Score | AI Data Quality Manager | Real-time |

---

# Metric Standards

Every metric must include:

- Standard Name
- Business Definition
- Formula
- Unit
- Data Source
- Owner
- Refresh Frequency
- Target Value
- Warning Threshold
- Critical Threshold

---

# Metric Governance Rules

- Every metric must have one owner.
- Metric formulas require approval before changes.
- Metric history must be retained.
- KPI Library references this catalog.
- Dashboards must only use approved metrics.

---

# Related Documents

- README.md
- INDEX.md
- WORKFLOW_MAP.md
- KPI_LIBRARY.md
- REPORT_CATALOG.md
- DATA_SOURCE_MAP.md

---

# Version History

| Version | Description |
|---------|-------------|
| 1.0 | Initial Enterprise Metric Catalog |

---

© 2026 Telepizza Platform

Powered by Mianx.ai
