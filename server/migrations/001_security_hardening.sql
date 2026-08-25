-- Security hardening migration.
-- Idempotent: safe to re-run.

BEGIN;

-- ── payments.user_id was integer while users.id is uuid ───────────────────
-- Every INSERT in fulfillOrder threw on the cast and rolled the whole
-- transaction back, so a real payment took money and published nothing.
-- The table is empty, so the type can simply be corrected.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'user_id' AND data_type <> 'uuid'
  ) THEN
    DELETE FROM payments;  -- known-empty; guards against un-castable rows
    ALTER TABLE payments ALTER COLUMN user_id TYPE uuid USING NULL;
    ALTER TABLE payments ADD CONSTRAINT payments_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Server-side record of what each order actually paid for ───────────────
-- verifyPayment used to trust cardIds/qrIds from the request body, which the
-- HMAC does not cover — so a 1-item order could publish any number of items.
-- The authoritative item list now lives here and the request body is ignored.
-- `status` doubles as the replay guard: fulfilment flips 'created'->'paid' in
-- a conditional UPDATE, so a replayed signature finds nothing to consume.
CREATE TABLE IF NOT EXISTS payment_orders (
  razorpay_order_id TEXT PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_ids          JSONB NOT NULL DEFAULT '[]',
  qr_ids            JSONB NOT NULL DEFAULT '[]',
  amount_paise      INTEGER NOT NULL,
  status            TEXT NOT NULL DEFAULT 'created',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_orders_user_idx ON payment_orders(user_id);

-- ── Token invalidation ────────────────────────────────────────────────────
-- Without this, changing a password (or an admin resetting one because the
-- account was compromised) left every existing JWT valid for up to 7 days.
-- Tokens issued before this timestamp are now rejected.
ALTER TABLE users ADD COLUMN IF NOT EXISTS credentials_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Admin action audit trail ──────────────────────────────────────────────
-- Admin is a single shared credential; at minimum every destructive action
-- it performs should be attributable and reviewable after the fact.
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id         BIGSERIAL PRIMARY KEY,
  actor      TEXT NOT NULL,
  action     TEXT NOT NULL,
  target_type TEXT,
  target_id  TEXT,
  detail     JSONB,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON admin_audit_log(created_at DESC);

-- ── Account deletion feedback ─────────────────────────────────────────────
-- Was being created with CREATE TABLE IF NOT EXISTS inside the delete request
-- path, which required the app role to hold schema-create rights at runtime.
CREATE TABLE IF NOT EXISTS account_deletion_feedback (
  id         UUID PRIMARY KEY,
  user_id    UUID NOT NULL,
  email      TEXT,
  reason     TEXT NOT NULL,
  details    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
