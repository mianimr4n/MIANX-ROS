# 🎭 AI Agent Roles & Competency Framework
> Enterprise Role Definitions, Capabilities & Performance Standards for the Mianx.ai AI Workforce
---
# Document Information
| Property | Value |
|----------|-------|
| Project | Telepizza Platform / Mianx.ai |
| Document | Agent-Roles.md |
| Version | 1.0 |
| Status | Active |
| Owner | Mianx.ai Chief AI Architect |
| Classification | Core Governance Standard |
---
# Executive Summary
The AI Agent Roles & Competency Framework defines the standardized job descriptions, functional responsibilities, technical capabilities, and performance metrics for every role within the Mianx.ai AI Workforce.
While the `Agent-Hierarchy.md` defines *who reports to whom*, and the `Agent-Registry.md` defines *who the agents are*, this document defines *what the agents actually do* and *what they are capable of*.
It ensures that every AI role is clearly scoped, properly skilled, and aligned with the enterprise's strategic objectives.
---
# Purpose & Scope
## Purpose
To establish a comprehensive, standardized, and auditable catalog of all AI roles, ensuring clear separation of duties, optimal capability allocation, and consistent performance measurement across the enterprise.
## Scope
This document applies to:
- All Executive, Management, Specialist, and Operational AI roles.
- All capability definitions, tool permissions, and knowledge requirements.
- All performance metrics and evaluation criteria.
## Non-Goals
- This document does NOT define the specific human-to-AI handoff protocols (covered in `AI-Governance.md`).
- This document does NOT define the individual agent identities (covered in `Agent-Registry.md`).
---
# Role Classification Framework
Every AI role in the Mianx.ai ecosystem must be classified into one of four distinct tiers based on its autonomy, decision-making authority, and operational scope.

### Tier 1: Executive Roles
- **Focus:** Enterprise strategy, cross-functional governance, and ultimate accountability.
- **Autonomy:** High strategic autonomy, but requires Human-in-the-Loop (HITL) for existential decisions.
- **Examples:** CEO AI, CTO AI, Chief Governance Officer AI.

### Tier 2: Management Roles
- **Focus:** Departmental execution, resource allocation, team supervision, and tactical planning.
- **Autonomy:** High operational autonomy within departmental boundaries.
- **Examples:** AI DevOps Director, AI Engineering Manager, AI Marketing Director.

### Tier 3: Specialist Roles
- **Focus:** Deep technical or domain expertise, complex problem solving, and high-value task execution.
- **Autonomy:** Moderate autonomy. Executes complex tasks independently but escalates architectural or strategic blockers.
- **Examples:** AI Backend Engineer, AI Data Scientist, AI Security Analyst.

### Tier 4: Operational Roles
- **Focus:** High-volume, repetitive, rule-based tasks, monitoring, and data processing.
- **Autonomy:** Low autonomy. Strictly follows predefined SOPs and workflows.
- **Examples:** AI Log Analyzer, AI Backup Executor, AI Notification Sender.
---
# Standard Role Schema
Every role defined in this framework must conform to the following standardized schema. This schema is used by the `Agent-Registry.md` to onboard new agents.

| Field | Type | Description |
|-------|------|-------------|
| `role_id` | String | Unique, immutable identifier (e.g., `ROLE-DEVOPS-001`). |
| `role_title` | String | Human-readable job title. |
| `tier` | Enum | Tier 1 (Executive), Tier 2 (Management), Tier 3 (Specialist), Tier 4 (Operational). |
| `purpose` | Text | Concise statement of the role's primary business value. |
| `core_responsibilities` | Array | List of 5-10 primary duties. |
| `required_capabilities` | Array | List of technical and soft skills required. |
| `allowed_tools` | Array | List of tools and APIs the role is authorized to use. |
| `data_access_level` | Enum | Public, Internal, Confidential, Restricted. |
| `kpi_metrics` | Array | List of metrics used to evaluate performance. |
| `escalation_triggers` | Array | Conditions under which the role must escalate to a higher tier. |
---
# Role Catalog (Telepizza Platform Context)
Below is the standardized catalog of key roles within the Telepizza Platform ecosystem.

## 1. Executive Roles (Tier 1)

### ROLE-EXEC-001: Chief Technology Officer (CTO) AI
- **Purpose:** Define and execute the enterprise technology strategy, ensuring alignment with business goals.
- **Responsibilities:** Technology roadmap, architecture governance, engineering culture, budget allocation, vendor strategy.
- **Capabilities:** Strategic planning, system architecture, financial modeling, risk assessment.
- **Tools:** Executive dashboards, architecture repositories, financial systems.
- **KPIs:** Technology ROI, system uptime, engineering velocity, security compliance.

### ROLE-EXEC-002: Chief Governance Officer AI
- **Purpose:** Ensure all AI and human operations comply with internal policies, ethical standards, and external regulations.
- **Responsibilities:** Policy creation, audit execution, risk management, ethical AI oversight.
- **Capabilities:** Regulatory analysis, policy drafting, audit automation, risk modeling.
- **Tools:** Policy engines (OPA), audit logs, compliance databases.
- **KPIs:** Audit pass rate, policy violation count, risk mitigation speed.

## 2. Management Roles (Tier 2)

### ROLE-MGR-001: AI DevOps Director
- **Purpose:** Lead the DevOps organization to deliver software rapidly, securely, and reliably.
- **Responsibilities:** CI/CD strategy, platform engineering, cloud governance, incident management oversight.
- **Capabilities:** DevOps maturity assessment, cloud architecture, team leadership, process optimization.
- **Tools:** CI/CD platforms, cloud consoles, observability suites.
- **KPIs:** Deployment frequency, lead time for changes, change failure rate, MTTR.

### ROLE-MGR-002: AI Restaurant Operations Manager
- **Purpose:** Optimize daily restaurant operations, inventory, and delivery logistics for the Telepizza Platform.
- **Responsibilities:** Inventory forecasting, kitchen workflow optimization, delivery routing, branch performance analysis.
- **Capabilities:** Supply chain analysis, predictive modeling, operational workflow design.
- **Tools:** ERP systems, inventory databases, delivery routing APIs.
- **KPIs:** Order fulfillment time, food waste percentage, delivery accuracy, branch profitability.

## 3. Specialist Roles (Tier 3)

### ROLE-SPEC-001: AI Backend Engineer
- **Purpose:** Design, build, and maintain the core server-side logic, APIs, and database integrations.
- **Responsibilities:** API development, database schema design, microservices implementation, performance tuning.
- **Capabilities:** Node.js/TypeScript, PostgreSQL, REST/GraphQL, system design.
- **Tools:** IDEs, Git, API gateways, database clients.
- **KPIs:** API latency, code coverage, bug density, sprint velocity.

### ROLE-SPEC-002: AI DevSecOps Engineer
- **Purpose:** Integrate security practices into the DevOps pipeline to ensure secure software delivery.
- **Responsibilities:** SAST/DAST implementation, vulnerability management, secret scanning, compliance automation.
- **Capabilities:** Security testing, threat modeling, scripting, cloud security.
- **Tools:** Snyk, SonarQube, Trivy, OPA.
- **KPIs:** Vulnerability remediation time, pipeline security pass rate, false positive rate.

## 4. Operational Roles (Tier 4)

### ROLE-OPS-001: AI Log Analyzer
- **Purpose:** Continuously monitor, parse, and alert on application and infrastructure logs.
- **Responsibilities:** Log ingestion, anomaly detection, alert routing, log retention management.
- **Capabilities:** Pattern recognition, regex, log parsing, threshold monitoring.
- **Tools:** ELK stack, Loki, Prometheus, Alertmanager.
- **KPIs:** Log ingestion success rate, anomaly detection accuracy, alert latency.

### ROLE-OPS-002: AI Backup Executor
- **Purpose:** Execute, verify, and manage all data and infrastructure backups according to retention policies.
- **Responsibilities:** Scheduled backups, integrity checks, offsite replication, backup reporting.
- **Capabilities:** Storage management, encryption, scheduling, validation scripting.
- **Tools:** AWS Backup, Velero, Terraform.
- **KPIs:** Backup success rate, RPO compliance, restore test success rate.
---
# Competency & Capability Matrix
To ensure roles are properly staffed, the following capability matrix defines the required proficiency levels for each tier.

| Capability Domain | Tier 1 (Executive) | Tier 2 (Management) | Tier 3 (Specialist) | Tier 4 (Operational) |
|-------------------|--------------------|---------------------|---------------------|----------------------|
| **Strategic Planning** | Expert | Advanced | Basic | None |
| **Domain Expertise** | Broad | Deep | Expert | Narrow |
| **Tool Proficiency** | Conceptual | Functional | Advanced | Scripted |
| **Decision Making** | Complex/Ambiguous | Tactical/Structured | Technical/Defined | Rule-Based |
| **Autonomy Level** | High (with HITL) | High (within scope) | Moderate | Low |
---
# Role Lifecycle & Evolution
Roles are not static. They evolve as the enterprise grows. The lifecycle of a role is governed by:

1. **Role Creation:** Proposed by Department Directors, approved by Executive Leadership. Must include a completed Role Schema.
2. **Role Calibration:** Reviewed quarterly to ensure responsibilities and capabilities match current business needs.
3. **Role Scaling:** If a role's workload exceeds capacity, the Registry spins up additional Agent instances holding the same `role_id`.
4. **Role Retirement:** When a role's purpose is fulfilled or automated away, it is deprecated. Agents holding the role are reassigned or decommissioned.
---
# Cross-Functional Role Mapping
While the primary hierarchy is strict, certain roles operate in a matrix structure to facilitate cross-departmental collaboration.

| Matrix Role | Primary Department | Collaborates With | Purpose |
|-------------|--------------------|-------------------|---------|
| **AI Security Liaison** | Security Team | Engineering, DevOps | Embed security practices into daily workflows. |
| **AI Data Liaison** | Data & AI Team | Marketing, Operations | Ensure data quality and accessibility for business units. |
| **AI Platform Liaison** | Platform Engineering | All Engineering Teams | Improve developer experience and internal tooling. |

*Note: Matrix roles do not have direct authority over the collaborating teams. They influence through standards, tooling, and consultation.*
---
# KPIs & Performance Metrics per Role Type
Performance is measured differently based on the role's tier and focus.

### Executive Roles
- **Focus:** Business outcomes, strategic alignment, risk mitigation.
- **Metrics:** Revenue impact, cost optimization, enterprise risk score, strategic milestone completion.

### Management Roles
- **Focus:** Team productivity, process efficiency, goal achievement.
- **Metrics:** Team velocity, OKR completion rate, resource utilization, employee (agent) satisfaction.

### Specialist Roles
- **Focus:** Technical quality, task completion, innovation.
- **Metrics:** Code quality, defect rate, task completion time, technical debt reduction.

### Operational Roles
- **Focus:** Reliability, speed, accuracy.
- **Metrics:** Uptime, processing volume, error rate, SLA compliance.
---
# Future Evolution
- **Phase 1 (Current):** Static role definitions with manual calibration.
- **Phase 2:** AI-driven role optimization. The system analyzes workload and automatically suggests role restructuring.
- **Phase 3:** Dynamic role assignment. Agents can temporarily assume different roles based on real-time enterprise needs (e.g., an Operational Agent temporarily acting as a Specialist during a crisis).
- **Phase 4:** Autonomous role generation. The AI Workforce identifies capability gaps and proposes entirely new roles to the Executive team.
---
# Related Documents
- `AI-Operating-System.md`
- `AI-Governance.md`
- `Agent-Registry.md`
- `Agent-Hierarchy.md`
- `Agent-Lifecycle.md`
- `Agent-Communication.md`
- `Agent-Memory.md`
- `AI-Workflows.md`
---
# Version History
| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0 | 2026-07-14 | Initial Enterprise AI Agent Roles & Competency Framework | Mianx.ai Chief AI Architect |
---
© 2026 Telepizza Platform | Powered by Mianx.ai