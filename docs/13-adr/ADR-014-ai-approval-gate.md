# ADR-014: AI Human-Approval Gate Architecture

**Status:** ACCEPTED
**Version:** 1.0
**Date accepted:** 2026-08-14
**Implemented in:** `v1.9.0` (migration `20260820000100_adr_014_ai_approval_gate.sql`)

---

## Context

AI agents that take autonomous actions (e.g. "cancel this order", "issue
a refund", "apply a discount") pose operational and financial risks:

1. **Hallucinated actions.** An LLM might confidently decide to cancel
   a valid order based on a misread customer message, costing Telepizza
   a real sale + customer trust.
2. **No accountability.** If an AI action causes harm, who is
   responsible — the AI, the developer, or the operator who deployed
   it? Without an explicit approval step, the answer is unclear.
3. **Audit gap.** Even if AI actions are logged, there is no record of
   WHO approved them and WHY. Compliance cannot trace decisions to a
   human.

Phase 2.6 (AI) closes this gap. ADR-014 establishes that AI outputs
are ADVISORY ONLY — every state-mutating action requires an explicit
human approval before execution.

## Decision

Implement AI human-approval gate with these rules:

1. **AI outputs are advisory only.** The AI agent can SUGGEST actions
   (e.g. "I recommend cancelling order X because the customer
   requested it 3 times"), but it CANNOT execute them. Execution
   requires a human to click "Approve".

2. **`ai_approvals` table.** Every AI-suggested action creates a row:
   - `id` — UUID
   - `ai_call_log_id` — FK to the AI call that produced the suggestion
   - `action_type` — e.g. `order.cancel`, `order.refund`,
     `customer.merge`, `loyalty.adjust_points`
   - `action_payload` — JSONB with the action parameters (e.g.
     `{"order_id": "...", "reason": "..."}`)
   - `status` — `pending` | `approved` | `rejected` | `executed` |
     `failed`
   - `requested_by` — the user who triggered the AI call (or
     `system` for scheduled agents)
   - `decided_by` — NULL until a human decides
   - `decided_at` — NULL until decision
   - `decision_reason` — human's reason for approve/reject
   - `executed_at` — NULL until the action is actually run
   - `execution_result` — JSONB with the outcome (success/failure +
     details)
   - `expires_at` — approval window (default 7 days; after which
     the suggestion is auto-expired)

3. **State machine:**
   ```
   pending → approved → executed
   pending → rejected (terminal)
   pending → expired (terminal, auto after 7 days)
   approved → failed (execution failed; can retry → back to approved)
   ```

4. **Approval requires `ai.approve` permission.** Granted to
   super-admin and branch-manager only. Customer-support and other
   roles can VIEW pending approvals but cannot approve/reject.

5. **Execution is atomic + idempotent.** When an approval is marked
   `approved`, a background worker picks it up and executes the
   action by calling the appropriate domain service (e.g.
   `orders.cancel()`). If execution fails, the status becomes
   `failed` and the worker retries up to 3 times with exponential
   backoff. After 3 failures, the status stays `failed` and a
   super-admin must manually intervene.

6. **Action types are allowlisted.** The `action_type` column has a
   CHECK constraint that only permits pre-defined action types. Adding
   a new action type requires a migration. This prevents AI from
   suggesting arbitrary actions.

7. **Audit trail.** Every state transition (pending → approved →
   executed) is logged in `domain_events` (ADR-012) with the actor,
   reason, and result. This makes the full approval chain queryable
   across domains.

8. **No auto-execution bypass.** Even super-admin cannot configure
   auto-execution for specific action types. The human approval step
   is NON-NEGOTIABLE. If the business wants auto-execution for a
   specific case, it requires a NEW ADR superseding ADR-014.

## Consequences

### Positive

- **No hallucinated actions.** AI cannot cause harm without a human
  explicitly clicking "Approve".
- **Full accountability.** Every executed action has a named human
  approver + reason.
- **Audit compliance.** The approval chain is queryable and
  tamper-proof (append-only transitions).
- **Safe to deploy AI.** Operators can confidently deploy AI agents
  knowing they cannot act autonomously.

### Negative

- **Latency for actions.** Even simple actions (e.g. "cancel order")
  require a human to click Approve. This adds operational latency.
  Mitigated by:
  - Real-time notifications to approvers (WebSocket push when a new
    approval is created).
  - Mobile-friendly approval UI (branch managers can approve from
    their phone).
- **Approval backlog.** If approvers don't act, suggestions pile up.
  The `expires_at` column auto-expires stale suggestions after 7 days
  to prevent backlog.
- **Manual retry on failure.** If execution fails after 3 retries,
  human intervention is required. This is intentional — failed
  executions need investigation, not silent retry loops.

## Implementation references

- Migration: `supabase/migrations/20260820000100_adr_014_ai_approval_gate.sql`
- TypeScript service: `backend/api/src/services/ai/approval-service.ts`
- Admin route: `backend/api/src/modules/admin/ai-approvals.ts`
- Tests: `backend/api/tests/ai-approval-service.test.ts`

## Future work (out of scope for this ADR)

- **Auto-expiry job** — A scheduled job that marks `pending` approvals
  as `expired` after `expires_at`. Out of scope; the schema supports
  it via a simple DELETE/UPDATE query.
- **Approval notifications** — WebSocket push to approvers when a new
  suggestion is created. Out of scope; the approval list endpoint
  supports polling.
- **Delegated approval** — Allowing a branch-manager to delegate
  approval authority to a specific customer-support agent for a
  time window. Out of scope; requires a separate delegation table.
