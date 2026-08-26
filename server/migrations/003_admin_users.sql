-- Real multi-admin support. Idempotent: safe to re-run.
--
-- Previously "admin" was a single shared credential pair in server/.env
-- (ADMIN_EMAIL/ADMIN_PASSWORD), checked with a constant-time string compare.
-- That meant exactly one admin identity could ever exist, and admin_audit_log
-- (migration 001) could only ever attribute actions to that one email.
--
-- This table lets any number of admin accounts exist, each with its own
-- bcrypt-hashed password, so audit log entries actually distinguish who did
-- what.

BEGIN;

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
