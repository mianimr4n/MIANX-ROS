# Phase 2 Readiness Audit — Observability & Operations

**Audit date:** 2026-08-04
**Status:** PROPOSED — Operational metrics, health checks, runbooks, and failure recovery policies

---

## Health & Readiness Indicators

Each Phase 2 backend service module must export standardized health and readiness status endpoints:

- **`/healthz`**: Basic process liveness check (HTTP 200).
- **`/readyz`**: Full dependency readiness probe (Database pool, Supabase connection, Provider webhooks, Config cache). Returns HTTP 200 when ready, HTTP 503 Service Unavailable when degraded.

---

## Domain Operational Metrics & Alerts

| Domain | Key Metrics | Failure Threshold | Paging / Alert Threshold | Runbook Action |
|---|---|---|---|---|
| **2.1 Settings Control Plane** | `config_activation_failures_total`, `schema_validation_errors` | > 1 failure / hour | Warning alert | Verify `configuration_change_log`; rollback to previous active version. |
| **2.2 Support & WhatsApp** | `whatsapp_webhook_signature_failures`, `webhook_ingestion_latency_ms`, `message_delivery_failures` | > 5 signature failures / min OR latency > 2000ms | Critical alert (possible key compromise or provider outage) | Check WABA provider dashboard; verify webhook secret; inspect outbox retry queue. |
| **2.3 CRM & Customer Master** | `customer_merge_conflicts`, `privacy_request_backlog` | > 10 pending requests | Warning alert | Review `customer_merge_log`; inspect queue for stuck deletion tasks. |
| **2.4 Delivery & Rider** | `gps_ping_drop_rate`, `failed_delivery_ratio`, `cod_reconciliation_variance_pkr` | Variance > PKR 1,000 OR failed ratio > 15% | Critical alert | Audit `cod_settlements`; switch to manual dispatch mode if GPS provider down. |
| **2.5 Accounting** | `journal_posting_unbalanced_attempts`, `period_close_validation_errors` | > 0 unbalanced attempts | Critical alert (Integrity failure) | Halt automatic postings; inspect `finance_postings` idempotency keys. |
| **2.6 AI Command Center** | `ai_provider_error_rate`, `ai_approval_queue_depth`, `prompt_cost_daily_usd` | Cost > Daily Limit OR Error Rate > 20% | Warning alert | Disable generative agent calls; fallback to rule-based summary mode. |

---

## Operational Runbooks & Graceful Degradation

### 1. WhatsApp Provider Outage
- **Symptom**: Webhook ping timeouts or HTTP 5xx responses from WABA provider.
- **Degradation**: Switch inbox UI banner to "Provider Offline - Queuing Outbound Messages". Inbound messages queue at provider; outbound messages persist in `messages` table with status `pending_retry`.

### 2. GPS Provider / Network Outage
- **Symptom**: Rider app location pings fail or drop below 10%.
- **Degradation**: Dispatch console switches map panel to "Manual Location Mode". Riders manually tap "Out for Delivery" and "Delivered" without automated geofence triggers.

### 3. Financial Period Lock Conflict
- **Symptom**: Automated postings fail with `PERIOD_LOCKED` error.
- **Degradation**: Event is written to `finance_postings` with status `pending_period_open`. Posting automatically retries once period is opened or next period is active.

### 4. AI Provider Failure / Hallucination Rate Spikes
- **Symptom**: High error rate from AI LLM API or high rejection rate on `ai_approvals`.
- **Degradation**: Suspend AI task queue processing. Dashboard automatically reverts to deterministic rule-based insights ("Mianx.ai Rule Engine").
