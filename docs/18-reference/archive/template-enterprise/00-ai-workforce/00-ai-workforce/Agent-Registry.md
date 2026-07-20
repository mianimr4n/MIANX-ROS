# ️ AI Agent Registry
> Central Identity, Catalog & Lifecycle Management Standard for the Mianx.ai AI Workforce
---
# Document Information
| Property | Value |
|----------|-------|
| Project | Telepizza Platform / Mianx.ai |
| Document | Agent-Registry.md |
| Version | 1.0 |
| Status | Active |
| Owner | Mianx.ai Chief AI Architect |
| Classification | Core Governance Standard |
---
# Executive Summary
The AI Agent Registry is the single source of truth (SSOT) for every artificial intelligence agent, model, and automated workflow operating within the Mianx.ai ecosystem. 
It functions as a dynamic, queryable, and strictly governed catalog that tracks the identity, capabilities, permissions, ownership, and operational status of every AI asset.
Just as an enterprise maintains a Configuration Management Database (CMDB) for IT assets, the AI Agent Registry ensures that no AI agent can operate, access tools, or process data without being cryptographically identified, authorized, and continuously monitored.
---
# Purpose & Scope
## Purpose
To establish a standardized, secure, and auditable mechanism for registering, discovering, managing, and retiring AI Agents across the entire enterprise.
## Scope
This standard applies to:
- All Autonomous, Semi-Autonomous, and Assistive AI Agents.
- All underlying AI Models (LLMs, ML models, Embedding models) utilized by agents.
- All AI-driven workflows, pipelines, and decision engines.
## Non-Goals
- This document does NOT define the technical implementation of the registry database (e.g., SQL vs. Graph DB).
- This document does NOT replace the AI Governance Framework (covered in `AI-Governance.md`).
---
# Registry Architecture
The AI Agent Registry operates as a centralized, highly available, and immutable ledger. It is divided into three logical layers:

### 1. Identity & Metadata Layer
Stores the static and semi-static attributes of an agent (Who it is, who owns it, what its purpose is).
### 2. Capability & Tool Layer
Stores the dynamic attributes (What it can do, what APIs it can call, what tools it has access to).
### 3. State & Telemetry Layer
Stores the runtime and operational attributes (Is it active? When was it last used? What is its current health?).
---
# Agent Identity & Metadata Schema
Every agent registered in the system MUST conform to the following standardized metadata schema.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `agent_id` | UUID | Globally unique, immutable identifier. | `ag-8f4e2b1a-9c3d` |
| `agent_name` | String | Human-readable display name. | `AI Order Processing Agent` |
| `agent_class` | Enum | Category of the agent. | `Autonomous`, `Assistive`, `Workflow` |
| `version` | SemVer | Current version of the agent's logic/prompt. | `1.2.0` |
| `status` | Enum | Current lifecycle state. | `ACTIVE`, `SUSPENDED`, `RETIRED` |
| `owner_id` | UUID | ID of the human or executive AI responsible. | `usr-9a2b3c4d` |
| `department` | String | Business unit the agent serves. | `Restaurant Operations` |
| `clearance_level` | Enum | Maximum data access tier. | `Public`, `Internal`, `Confidential`, `Restricted` |
| `created_at` | Timestamp | Registration date. | `2026-07-14T10:00:00Z` |
| `last_updated` | Timestamp | Last modification date. | `2026-07-14T12:30:00Z` |
| `purpose` | Text | Clear, concise business purpose. | `Automates order validation and routing.` |
---
# Capability & Tool Schema
To enforce the Principle of Least Privilege, an agent's capabilities must be explicitly declared and approved during registration.

| Field | Type | Description |
|-------|------|-------------|
| `allowed_tools` | Array | List of approved tool IDs the agent can invoke. |
| `allowed_models` | Array | List of approved underlying AI models. |
| `memory_schema` | Object | Definition of what data the agent can store in its memory. |
| `api_scopes` | Array | Specific API endpoints the agent is authorized to call. |
| `data_access` | Array | Specific database tables or data domains accessible. |
| `max_concurrency` | Integer | Maximum parallel executions allowed. |
| `rate_limits` | Object | API call limits per minute/hour. |
---
# Agent Lifecycle States
Every agent in the Registry MUST transition through the following standardized states. Unauthorized state transitions are strictly prohibited.

| State | Description | Permissions |
|-------|-------------|-------------|
| **DRAFT** | Agent is being designed. Not executable. | Can be edited by Owner. |
| **PENDING_APPROVAL** | Submitted for Security & Governance review. | Read-only. |
| **ACTIVE** | Fully operational and processing tasks. | Executing tools, accessing data. |
| **MAINTENANCE** | Temporarily paused for updates or debugging. | Cannot execute new tasks. |
| **SUSPENDED** | Paused due to security violation or policy breach. | Cannot execute. Requires Admin intervention. |
| **RETIRED** | Permanently decommissioned. | Read-only access to historical logs. |
---
# Registration & Onboarding Process
No AI agent can be deployed to production without completing the following registration workflow:

1. **Design & Declaration:** 
   The AI Engineer or Department Head defines the agent's purpose, schema, and required tools using the standard templates.
2. **Automated Validation:** 
   The Registry runs automated checks (Schema validation, Security policy check, Duplicate ID check).
3. **Security & Governance Review:** 
   The AI Security Manager and AI Governance Manager review the requested capabilities and clearance levels.
4. **Approval & Issuance:** 
   Upon approval, the Registry generates a cryptographically secure `agent_id` and API credentials.
5. **Activation:** 
   The agent's status is updated to `ACTIVE`. It is now visible to the AI Operating System and can begin processing tasks.
---
# Access Control & RBAC for the Registry
The Registry itself is a highly sensitive system. Access is strictly controlled via Role-Based Access Control (RBAC).

| Role | Permissions |
|------|-------------|
| **AI Registry Admin** | Full CRUD access to all agent records. Can approve registrations. |
| **AI Security Manager** | Read access to all records. Can change status to `SUSPENDED`. Can modify `clearance_level`. |
| **Department Head / Owner** | Read access to own department's agents. Can update `DRAFT` agents. Cannot approve. |
| **AI Operating System** | Read-only access to `ACTIVE` agents for runtime orchestration and tool authorization. |
| **Auditor** | Read-only access to historical logs and state transitions. |
---
# Integration & APIs
The AI Agent Registry exposes secure, versioned APIs to integrate with the broader Mianx.ai ecosystem.

### 1. Discovery API
Allows the AI OS and other agents to find available agents based on capabilities.
`GET /api/v1/agents?capability=order_processing&status=ACTIVE`

### 2. Authorization API
Used by the Tool Execution Layer to verify if an agent is allowed to call a specific tool.
`POST /api/v1/authorize`
Body: `{ "agent_id": "...", "tool_id": "...", "action": "execute" }`

### 3. Telemetry & Health API
Allows the Observability layer to push runtime metrics and health status.
`PUT /api/v1/agents/{agent_id}/telemetry`

### 4. Lifecycle API
Used by the Governance layer to manage state transitions.
`PATCH /api/v1/agents/{agent_id}/status`
---
# Security & Compliance
### 1. Immutability & Audit Trails
- Every change to an agent's record (especially `allowed_tools` and `clearance_level`) is logged in an immutable audit trail.
- Historical versions of an agent's configuration are retained for forensic analysis.

### 2. Credential Management
- API keys and secrets generated for agents are stored in the enterprise Secrets Manager (e.g., HashiCorp Vault), NOT in the Registry database. The Registry only stores references to the secrets.

### 3. Regular Audits
- **Weekly:** Automated scan for orphaned agents (agents in `ACTIVE` state with no telemetry for >7 days).
- **Monthly:** Governance review of all agents with `Restricted` clearance levels.
- **Annually:** Full compliance audit against the AI Governance Framework.
---
# KPIs & Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Registry Coverage | 100% | % of running agents formally registered. |
| Unauthorized Agent Count | 0 | Number of agents running without a valid Registry ID. |
| Registration Lead Time | < 24 Hours | Time from Draft to Active approval. |
| Orphaned Agent Count | 0 | Active agents with no recent telemetry. |
| Audit Compliance | 100% | % of state changes properly logged and approved. |
---
# Future Evolution
- **Phase 1 (Current):** Centralized relational/graph database with REST APIs.
- **Phase 2:** Decentralized identity (DID) and verifiable credentials for cross-enterprise agent recognition.
- **Phase 3:** AI-driven anomaly detection to automatically suspend agents exhibiting rogue behavior.
- **Phase 4:** Dynamic capability negotiation, where agents can temporarily request elevated permissions via smart contracts.
---
# Related Documents
- `AI-Operating-System.md`
- `AI-Governance.md`
- `Agent-Hierarchy.md`
- `Agent-Roles.md`
- `Agent-Lifecycle.md`
- `../09-security-team/SECRETS_MANAGEMENT.md`
---
# Version History
| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0 | 2026-07-14 | Initial Enterprise AI Agent Registry Standard | Mianx.ai Chief AI Architect |
---
© 2026 Telepizza Platform | Powered by Mianx.ai