# 🗣️ AI Agent Communication Protocol
> Enterprise Inter-Agent, Human, and External Communication Standard for the Mianx.ai AI Workforce
---
# Document Information
| Property | Value |
|----------|-------|
| Project | Telepizza Platform / Mianx.ai |
| Document | Agent-Communication.md |
| Version | 1.0 |
| Status | Active |
| Owner | Mianx.ai Chief AI Architect |
| Classification | Core Governance Standard |
---
# Executive Summary
The AI Agent Communication Protocol defines the standardized languages, message formats, routing mechanisms, and interaction models used by all artificial intelligence agents within the Mianx.ai ecosystem.
It serves as the "nervous system" of the AI Workforce, ensuring that information flows securely, efficiently, and intelligently between agents, human operators, and external enterprise systems.
By enforcing strict communication standards, this protocol prevents data silos, eliminates ambiguous instructions, and enables complex, multi-agent collaboration at enterprise scale.
---
# Purpose & Scope
## Purpose
To establish a unified, secure, and highly reliable communication framework that governs all data exchange and interaction within the AI Workforce.
## Scope
This standard applies to:
- **Inter-Agent Communication:** Agent-to-Agent (A2A) task delegation, context sharing, and collaboration.
- **Human-to-Agent Communication:** Human-in-the-Loop (HITL) approvals, escalations, and manual overrides.
- **Agent-to-System Communication:** Integration with external APIs, databases, and enterprise services (e.g., Supabase, Stripe, WhatsApp).
## Non-Goals
- This document does NOT define the underlying network infrastructure (covered in `AI-Operating-System.md`).
- This document does NOT define specific UI/UX designs for human dashboards.
---
# Core Principles
Every communication event within the AI Workforce MUST adhere to these immutable principles:

### 1. Standardization
Every message MUST conform to the Universal Message Schema. Proprietary or ad-hoc formats are strictly prohibited.

### 2. Asynchronous by Default
To ensure high availability and decoupling, communication is asynchronous. Synchronous (blocking) calls are only permitted for critical, real-time HITL gates.

### 3. Context Preservation
Every message MUST carry sufficient context (trace IDs, session IDs, memory references) so the receiver can process it without needing to query external state unnecessarily.

### 4. Security & Zero Trust
Every message MUST be authenticated, authorized, and encrypted. No agent trusts a message solely based on its source; payload validation is mandatory.

### 5. Traceability & Auditability
Every communication event MUST be logged in the immutable Audit Ledger. No "dark" or unlogged communication is permitted.

### 6. Idempotency
Message processing MUST be idempotent. If a message is delivered twice due to network retries, it MUST NOT cause duplicate side effects (e.g., double-charging a customer).
---
# Universal Message Schema (UMS)
All internal AI Workforce communication MUST use the following standardized JSON/YAML schema.

```json
{
  "meta": {
    "message_id": "msg-8f4e2b1a-9c3d",
    "timestamp": "2026-07-14T10:00:00Z",
    "trace_id": "trace-xyz-123",
    "session_id": "sess-abc-456",
    "priority": "HIGH",
    "ttl": 300
  },
  "routing": {
    "sender_id": "ag-order-processor-01",
    "receiver_id": "ag-inventory-checker-02",
    "intent": "CHECK_STOCK",
    "reply_to": "ag-order-processor-01"
  },
  "context": {
    "customer_id": "cust-999",
    "order_id": "ord-12345",
    "branch_id": "br-royal-orchard"
  },
  "payload": {
    "item_sku": "PIZZA-TELE-SPECIAL-L",
    "quantity": 2
  },
  "security": {
    "signature": "sha256-abc...",
    "clearance_level": "INTERNAL"
  }
}
```

### Schema Breakdown
- **meta:** Routing, tracking, and lifecycle metadata.
- **routing:** Source, destination, intent, and routing instructions.
- **context:** Business context required to process the payload.
- **payload:** The actual data or instruction being transmitted.
- **security:** Cryptographic signature and data classification.
---
# Communication Models
The AI Workforce supports four primary communication models:

### 1. Request/Response (Synchronous)
Used for: HITL approvals, real-time payment gateways, critical validation.
Flow: Sender -> Receiver -> Response.
Constraint: Strict timeout (TTL) enforcement.

### 2. Publish/Subscribe (Asynchronous)
Used for: Event broadcasting, state changes, logging.
Flow: Publisher -> Message Broker -> Multiple Subscribers.
Example: `ORDER_PLACED` event triggers Inventory, Kitchen, and Analytics agents simultaneously.

### 3. Peer-to-Peer (Direct A2A)
Used for: Complex task delegation, multi-agent problem solving.
Flow: Agent A -> Agent B -> Agent A.
Constraint: Must be logged in the central Audit Ledger.

### 4. Broadcast (One-to-Many)
Used for: Enterprise-wide policy updates, system shutdowns, emergency alerts.
Flow: Executive AI -> All Agents.
---
# Inter-Agent Communication (A2A)
When agents collaborate to solve complex tasks (e.g., processing a Telepizza order), they must follow the **Delegation & Collaboration Protocol**.

### Task Delegation
1. **Intent Declaration:** The orchestrator agent defines the task and required capabilities.
2. **Agent Discovery:** The orchestrator queries the `Agent-Registry` to find the best-suited agent.
3. **Context Handoff:** The orchestrator passes relevant memory and context to the worker agent.
4. **Execution & Acknowledgment:** The worker agent executes and returns a standardized status (Success, Failure, Needs-Human).

### Conflict Resolution
If two agents provide conflicting data (e.g., Pricing Agent vs. Discount Agent), the **Governance Agent** acts as the arbiter based on predefined business rules.
---
# Human-in-the-Loop (HITL) Communication
Communication between AI agents and human operators is strictly governed to prevent alert fatigue and ensure clear accountability.

### Escalation Triggers
Agents MUST escalate to humans ONLY when:
- Risk exceeds the agent's authorized threshold.
- The agent encounters an ambiguous situation not covered by its SOPs.
- A critical system failure requires physical or executive intervention.

### Human Response Protocol
1. **Notification:** Human receives a structured alert via Dashboard, Email, or Slack.
2. **Context Review:** Human reviews the agent's recommendation and supporting data.
3. **Decision:** Human provides a binary (Approve/Reject) or descriptive decision.
4. **Feedback Loop:** The agent logs the human decision to improve future autonomous behavior.
---
# External System Communication
When agents interact with external enterprise systems (e.g., Supabase, Payment Gateways, WhatsApp API), they MUST use the **Adapter Pattern**.

### Rules for External Integration
- **No Direct Database Access:** Agents MUST NOT write directly to databases. They MUST use approved API endpoints.
- **Rate Limiting:** Agents MUST respect external API rate limits and implement exponential backoff.
- **Data Transformation:** Agents MUST transform internal UMS payloads into the external system's required format (and vice versa) using dedicated Adapter Agents.
- **Timeout Handling:** All external calls MUST have strict timeouts. If an external system fails, the agent MUST trigger a fallback procedure.
---
# Security & Compliance in Communication
### 1. Authentication & Authorization
- Every message MUST be signed by the sender's cryptographic identity.
- The receiver MUST verify the signature and check the sender's permissions in the `Agent-Registry` before processing.

### 2. Data Privacy (PII/PCI)
- **PII Masking:** Personally Identifiable Information (e.g., customer phone numbers) MUST be masked or tokenized in transit unless strictly required for the specific task.
- **PCI Compliance:** Credit card data MUST NEVER be passed through the internal message bus. It MUST be handled exclusively by the Payment Gateway Adapter.

### 3. Encryption
- All internal communication MUST be encrypted in transit (TLS 1.3).
- Sensitive payloads MUST be encrypted at rest within the message broker.
---
# KPIs & Metrics
| Metric | Target | Description |
|--------|--------|-------------|
| Message Delivery Rate | 99.99% | % of messages successfully delivered to the receiver. |
| Message Latency (P95) | < 50 ms | Time taken for internal A2A message delivery. |
| HITL Response Time | < 15 mins | Average time for a human to respond to an escalation. |
| Routing Accuracy | 100% | % of messages routed to the correct destination agent. |
| Payload Validation Failures | < 0.1% | % of messages rejected due to schema or security violations. |
| Alert Fatigue Score | < 5% | % of HITL escalations that were false positives or unnecessary. |
---
# Future Evolution
- **Phase 1 (Current):** Standardized JSON messaging over enterprise message brokers (RabbitMQ/Kafka).
- **Phase 2:** Semantic Communication. Agents exchange "concepts" and "intents" rather than rigid JSON, allowing for more flexible, LLM-driven collaboration.
- **Phase 3:** Autonomous Protocol Negotiation. Agents dynamically agree on the most efficient communication protocol based on network conditions and task complexity.
- **Phase 4:** Cross-Enterprise Federation. Secure, standardized communication between Mianx.ai agents and external partner AI systems (e.g., supplier AI, delivery partner AI).
---
# Related Documents
- `AI-Operating-System.md`
- `AI-Governance.md`
- `Agent-Registry.md`
- `Agent-Hierarchy.md`
- `Agent-Memory.md`
- `AI-Workflows.md`
---
# Version History
| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0 | 2026-07-14 | Initial Enterprise AI Agent Communication Protocol | Mianx.ai Chief AI Architect |
---
© 2026 Telepizza Platform | Powered by Mianx.ai