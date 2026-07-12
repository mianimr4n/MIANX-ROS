# 📞 ON-CALL GUIDE

> Enterprise On-Call Operations & Operational Readiness Standard

---

# Document Information

| Property | Value |
|----------|-------|
| Project | Telepizza Platform |
| Module | Deployment Engineering |
| Category | On-Call Operations |
| Document | ON_CALL_GUIDE.md |
| Version | 2.0 |
| Status | Platinum Enterprise Standard |
| Classification | Enterprise Operations |
| Last Updated | 07 July 2026 |

---

# 1. Purpose

This document defines the enterprise standards for on-call operations across the Telepizza Platform.

The objective is to ensure production incidents receive rapid, coordinated, and effective responses while maintaining engineer wellbeing and operational excellence.

---

# 2. Vision

Every production incident should receive

- Immediate Ownership
- Rapid Response
- Clear Escalation
- Complete Handover
- Continuous Monitoring
- Professional Communication

---

# 3. Objectives

The On-Call Framework provides

- 24×7 Operational Coverage
- Defined Responsibilities
- Fast Incident Response
- Structured Escalation
- Operational Readiness
- Continuous Improvement

---

# 4. On-Call Lifecycle

Schedule

↓

Shift Start

↓

Operational Readiness

↓

Alert Received

↓

Incident Response

↓

Escalation

↓

Recovery

↓

Shift Handover

↓

Continuous Improvement

---

# 5. On-Call Roles

Primary On-Call

- First responder
- Initial investigation
- Incident ownership

Secondary On-Call

- Backup support
- Escalation assistance

Incident Commander

- Coordinates response
- Manages communication
- Approves major decisions

Subject Matter Experts (SMEs)

- Domain-specific support
- Database
- Kubernetes
- AI Platform
- Security

---

# 6. Shift Management

Every shift should define

- Start Time
- End Time
- Primary Engineer
- Secondary Engineer
- Incident Commander
- Escalation Contacts

Shift schedules should be published in advance.

---

# 7. Operational Readiness Checklist

Before every shift verify

- Alert channels operational
- Monitoring dashboards available
- Access credentials valid
- VPN access working
- Incident tools available
- Communication channels tested

---

# 8. Alert Response Expectations

| Severity | Initial Response |
|----------|------------------|
| SEV-1 | Immediate |
| SEV-2 | ≤15 Minutes |
| SEV-3 | ≤1 Hour |
| SEV-4 | Business Hours |

Every alert must receive acknowledgement.

---

# 9. Escalation Process

Primary On-Call

↓

Secondary On-Call

↓

Engineering Lead

↓

Operations Manager

↓

Executive Leadership

Escalation should follow severity and business impact.

---

# 10. Shift Handover

Every handover includes

- Active Incidents
- Monitoring Status
- Outstanding Risks
- Planned Maintenance
- Open Action Items
- Customer Impact

Handover should be documented.

---

# 11. AI-Assisted Operations

AI may assist with

- Alert Correlation
- Log Analysis
- Trace Analysis
- Root Cause Suggestions
- Runbook Recommendations
- Deployment History
- Health Summaries

AI recommendations support, but do not replace, human decision-making.

---

# 12. Engineer Wellbeing

Promote

- Fair rotation schedules
- Fatigue management
- Backup coverage
- Recovery time after major incidents
- Knowledge sharing

Sustainable operations improve reliability.

---

# 13. Governance

Every on-call schedule defines

- Owner
- Rotation Policy
- Escalation Matrix
- Handover Procedure
- Review Frequency

Schedules should remain current and accessible.

---

# 14. Enterprise KPIs

| KPI | Target |
|------|---------|
| On-Call Coverage | 100% |
| Alert Acknowledgement | ≥99% |
| SEV-1 Initial Response | <5 min |
| Successful Shift Handover | 100% |
| Escalation Compliance | 100% |

---

# 15. Best Practices

- Keep rotations predictable.
- Maintain complete handover notes.
- Test alerting regularly.
- Automate repetitive investigations.
- Review on-call metrics.
- Continuously improve operational readiness.

---

# 16. Related Documents

- INCIDENT_RESPONSE.md
- RUNBOOKS.md
- POSTMORTEM_PROCESS.md
- MONITORING_ALERTING.md
- BUSINESS_CONTINUITY.md
- DISASTER_RECOVERY.md

---

© 2026 Telepizza Platform

Powered by Mianx.ai
