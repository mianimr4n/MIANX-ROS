/**
 * Tests for ADR-004 — WhatsApp Conversation Ownership & Routing
 *
 * Verifies migration 20260816000100 creates the conversations / messages /
 * events / templates / inbound_events tables with the correct shape:
 * branch-scoped RLS, state machine trigger, message immutability trigger,
 * append-only audit, idempotent wamid UNIQUE.
 *
 * Authority: ADR-004 "WhatsApp Conversation Ownership & Routing"
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const MIGRATION_PATH = resolve(
  REPO_ROOT,
  "supabase/migrations/20260816000100_adr_004_whatsapp_conversation_ownership.sql",
);

const MIGRATION_SQL = readFileSync(MIGRATION_PATH, "utf8");

describe("ADR-004 — WhatsApp Conversation Ownership migration", () => {
  it("migration file exists and is non-empty", () => {
    expect(MIGRATION_SQL.length).toBeGreaterThan(1000);
  });

  // ---------- §0: customers.status extension ----------
  it("extends customers.status with 'provisional'", () => {
    expect(MIGRATION_SQL).toMatch(/drop constraint if exists customers_status_check/i);
    expect(MIGRATION_SQL).toMatch(/status in \('active', 'inactive', 'blocked', 'provisional'\)/i);
  });

  // ---------- §1: whatsapp_conversations ----------
  it("creates whatsapp_conversations table", () => {
    expect(MIGRATION_SQL).toMatch(
      /create table if not exists public\.whatsapp_conversations/i,
    );
  });

  it("conversations has branch_id FK (NOT NULL — ownership is mandatory)", () => {
    expect(MIGRATION_SQL).toMatch(
      /branch_id uuid not null references public\.branches \(id\) on delete restrict/i,
    );
  });

  it("conversations has customer_id FK (nullable until identity resolved)", () => {
    expect(MIGRATION_SQL).toMatch(
      /customer_id uuid references public\.customers \(id\) on delete set null/i,
    );
  });

  it("conversations has provider_config_id FK to whatsapp_provider_configs", () => {
    expect(MIGRATION_SQL).toMatch(
      /provider_config_id uuid not null references public\.whatsapp_provider_configs \(id\)/i,
    );
  });

  it("conversations status CHECK includes open/in_progress/escalated/resolved/closed", () => {
    expect(MIGRATION_SQL).toMatch(
      /status in \('open', 'in_progress', 'escalated', 'resolved', 'closed'\)/i,
    );
  });

  it("conversations has closed_at and pii_anonymized_at timestamps", () => {
    expect(MIGRATION_SQL).toMatch(/closed_at timestamptz/i);
    expect(MIGRATION_SQL).toMatch(/pii_anonymized_at timestamptz/i);
  });

  // ---------- §2: whatsapp_messages ----------
  it("creates whatsapp_messages table", () => {
    expect(MIGRATION_SQL).toMatch(/create table if not exists public\.whatsapp_messages/i);
  });

  it("messages has provider_message_id UNIQUE (idempotent webhook upsert)", () => {
    expect(MIGRATION_SQL).toMatch(/provider_message_id text unique/i);
  });

  it("messages direction CHECK includes inbound/outbound", () => {
    expect(MIGRATION_SQL).toMatch(/direction in \('inbound', 'outbound'\)/i);
  });

  it("messages delivery_status CHECK includes pending/sent/delivered/read/failed/permanently_failed", () => {
    expect(MIGRATION_SQL).toMatch(
      /delivery_status in \('pending', 'sent', 'delivered', 'read', 'failed', 'permanently_failed'\)/i,
    );
  });

  it("messages has media_url (external URL only, no binary)", () => {
    expect(MIGRATION_SQL).toMatch(/media_url text/i);
  });

  // ---------- §3: whatsapp_conversation_events (append-only) ----------
  it("creates whatsapp_conversation_events table", () => {
    expect(MIGRATION_SQL).toMatch(
      /create table if not exists public\.whatsapp_conversation_events/i,
    );
  });

  it("events event_type CHECK includes the canonical event names", () => {
    expect(MIGRATION_SQL).toMatch(/'created'/);
    expect(MIGRATION_SQL).toMatch(/'status_change'/);
    expect(MIGRATION_SQL).toMatch(/'agent_assigned'/);
    expect(MIGRATION_SQL).toMatch(/'escalated'/);
    expect(MIGRATION_SQL).toMatch(/'pii_anonymized'/);
    expect(MIGRATION_SQL).toMatch(/'branch_reassigned'/);
  });

  // ---------- §4: whatsapp_message_templates ----------
  it("creates whatsapp_message_templates table", () => {
    expect(MIGRATION_SQL).toMatch(
      /create table if not exists public\.whatsapp_message_templates/i,
    );
  });

  it("templates has UNIQUE on (template_key, language, provider_template_id)", () => {
    expect(MIGRATION_SQL).toMatch(
      /unique \(template_key, language, provider_template_id\)/i,
    );
  });

  it("templates category CHECK includes marketing/utility/authentication", () => {
    expect(MIGRATION_SQL).toMatch(/category in \('marketing', 'utility', 'authentication'\)/i);
  });

  // ---------- §5: whatsapp_inbound_events ----------
  it("creates whatsapp_inbound_events table", () => {
    expect(MIGRATION_SQL).toMatch(
      /create table if not exists public\.whatsapp_inbound_events/i,
    );
  });

  it("inbound_events has raw_payload jsonb (NOT NULL)", () => {
    expect(MIGRATION_SQL).toMatch(/raw_payload jsonb not null/i);
  });

  it("inbound_events has processed_at (nullable = pending)", () => {
    expect(MIGRATION_SQL).toMatch(/processed_at timestamptz/i);
  });

  // ---------- §6: State machine trigger ----------
  it("creates conversation_valid_next_states function", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.conversation_valid_next_states/i,
    );
  });

  it("state machine allows open -> in_progress/escalated/closed", () => {
    expect(MIGRATION_SQL).toMatch(/when current_state = 'open'\s+then array\['in_progress', 'escalated', 'closed'\]/);
  });

  it("state machine treats closed as terminal except reopen to in_progress", () => {
    expect(MIGRATION_SQL).toMatch(/when current_state = 'closed'\s+then array\['in_progress'\]/);
  });

  it("attaches trg_validate_conversation_state_transition BEFORE UPDATE", () => {
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_validate_conversation_state_transition\s+before update on public\.whatsapp_conversations/i,
    );
  });

  it("state machine rejects invalid transitions with errcode check_violation", () => {
    expect(MIGRATION_SQL).toMatch(/Invalid conversation state transition/);
    expect(MIGRATION_SQL).toMatch(/using errcode = 'check_violation'/);
  });

  // ---------- §7: Append-only enforcement on conversation_events ----------
  it("creates enforce_conversation_events_append_only function", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.enforce_conversation_events_append_only/i,
    );
  });

  it("blocks UPDATE on conversation_events via trigger", () => {
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_conversation_events_no_update\s+before update on public\.whatsapp_conversation_events/i,
    );
  });

  it("blocks DELETE on conversation_events via trigger", () => {
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_conversation_events_no_delete\s+before delete on public\.whatsapp_conversation_events/i,
    );
  });

  // ---------- §8: Message immutability trigger ----------
  it("creates enforce_whatsapp_message_immutability function", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.enforce_whatsapp_message_immutability/i,
    );
  });

  it("blocks UPDATE of inbound messages (append-only)", () => {
    expect(MIGRATION_SQL).toMatch(/Inbound whatsapp_messages are append-only/);
  });

  it("blocks UPDATE of sent outbound message body/content/template", () => {
    expect(MIGRATION_SQL).toMatch(
      /Cannot UPDATE body\/content\/template\/phone\/media of sent outbound whatsapp_message/,
    );
  });

  it("blocks DELETE of any whatsapp_message", () => {
    expect(MIGRATION_SQL).toMatch(/whatsapp_messages cannot be DELETEd/);
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_whatsapp_message_no_delete\s+before delete on public\.whatsapp_messages/i,
    );
  });

  it("supports bypass hook for trusted maintenance (24-month anonymization)", () => {
    expect(MIGRATION_SQL).toMatch(/app\.bypass_message_immutability/);
  });

  // ---------- §9-13: RLS policies ----------
  it("enables RLS on all five new tables", () => {
    expect(MIGRATION_SQL).toMatch(/alter table public\.whatsapp_conversations enable row level security/i);
    expect(MIGRATION_SQL).toMatch(/alter table public\.whatsapp_messages enable row level security/i);
    expect(MIGRATION_SQL).toMatch(/alter table public\.whatsapp_conversation_events enable row level security/i);
    expect(MIGRATION_SQL).toMatch(/alter table public\.whatsapp_message_templates enable row level security/i);
    expect(MIGRATION_SQL).toMatch(/alter table public\.whatsapp_inbound_events enable row level security/i);
  });

  it("conversations RLS uses canonical branch-scoping pattern with assignment_status='ACTIVE'", () => {
    expect(MIGRATION_SQL).toMatch(
      /ur\.assignment_status = 'ACTIVE'/,
    );
  });

  it("conversations RLS allows super-admin cross-branch read", () => {
    expect(MIGRATION_SQL).toMatch(/role_code = 'super-admin'/);
  });

  it("messages RLS inherits branch scoping via conversation join", () => {
    // The SQL spans multiple lines (aligned for readability); use a multiline-aware regex.
    expect(MIGRATION_SQL).toMatch(
      /select 1 from public\.whatsapp_conversations c\s+where c\.id = whatsapp_messages\.conversation_id/s,
    );
  });

  it("inbound_events is service_role only (not granted to authenticated/anon)", () => {
    expect(MIGRATION_SQL).toMatch(
      /grant select, insert, update on public\.whatsapp_inbound_events to service_role/i,
    );
    // Ensure NO grant to authenticated/anon on inbound_events (separate grant line check)
    const inboundGrants = MIGRATION_SQL.match(/grant[^;]*whatsapp_inbound_events[^;]*;/gi) || [];
    for (const g of inboundGrants) {
      expect(g).not.toMatch(/authenticated/i);
      expect(g).not.toMatch(/\banon\b/i);
    }
  });

  // ---------- §14: created event trigger ----------
  it("inserts 'created' event on new conversation via AFTER INSERT trigger", () => {
    expect(MIGRATION_SQL).toMatch(
      /create or replace function public\.whatsapp_conversation_created_event/i,
    );
    expect(MIGRATION_SQL).toMatch(
      /create trigger trg_whatsapp_conversation_created\s+after insert on public\.whatsapp_conversations/i,
    );
  });

  it("is wrapped in begin/commit transaction", () => {
    expect(MIGRATION_SQL).toMatch(/^begin;/m);
    expect(MIGRATION_SQL).toMatch(/^commit;/m);
  });
});
