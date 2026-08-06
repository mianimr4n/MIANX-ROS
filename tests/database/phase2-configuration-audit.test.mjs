import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it } from 'node:test';
import assert from 'assert';

const MIGRATION = 'supabase/migrations/20260805200000_phase2_01_configuration_audit_hardening.sql';
const content = readFileSync(resolve(MIGRATION), 'utf8');

describe('Phase2 configuration audit hardening migration', () => {
  it('creates trigger to prevent configuration_change_log mutations', () => {
    assert.match(content, /prevent_configuration_change_log_mutation/i);
    assert.match(content, /trg_prevent_configuration_change_log_mutation/i);
  });

  it('creates trigger to prevent deletes on configuration_versions', () => {
    assert.match(content, /prevent_configuration_versions_delete/i);
    assert.match(content, /trg_prevent_configuration_versions_delete/i);
  });
});
