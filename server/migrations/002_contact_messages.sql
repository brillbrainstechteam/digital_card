-- Contact page submissions. Idempotent: safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS contact_messages (
  id         UUID PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new', -- 'new' | 'read' | 'replied'
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages(created_at DESC);

COMMIT;
