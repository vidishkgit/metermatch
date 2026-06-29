-- MeterMatch — Aurora PostgreSQL schema (billing side).
-- Usage events do NOT live here; they live in DynamoDB.

CREATE TABLE IF NOT EXISTS plans (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  base           NUMERIC NOT NULL,
  included_calls BIGINT NOT NULL,
  overage_rate   NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS contracts (
  account_id         TEXT PRIMARY KEY REFERENCES accounts(id),
  rate_per_call      NUMERIC NOT NULL,
  discount_pct       NUMERIC NOT NULL DEFAULT 0,
  discount_ends_on   DATE,
  minimum_monthly    NUMERIC NOT NULL DEFAULT 0,
  price_uplift_pct   NUMERIC NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'active',
  -- extended detector inputs (nullable)
  upgraded_on        DATE,
  previous_base      NUMERIC,
  fx_rate_contracted NUMERIC,
  currency           TEXT,
  credit_balance     NUMERIC
);

CREATE TABLE IF NOT EXISTS invoices (
  account_id            TEXT NOT NULL REFERENCES accounts(id),
  period                TEXT NOT NULL,            -- 'YYYY-MM'
  base                  NUMERIC NOT NULL,
  billed_overage_calls  BIGINT NOT NULL DEFAULT 0,
  billed_overage_rate   NUMERIC NOT NULL DEFAULT 0,
  discount_pct_applied  NUMERIC NOT NULL DEFAULT 0,
  payment_status        TEXT NOT NULL DEFAULT 'paid',
  -- extended detector inputs (nullable)
  fx_rate_applied       NUMERIC,
  foreign_subtotal      NUMERIC,
  credits_applied       NUMERIC,
  metered_overage_calls BIGINT,
  PRIMARY KEY (account_id, period)
);

-- Persisted scan output (optional; the engine can also run purely in-memory).
CREATE TABLE IF NOT EXISTS findings (
  id                 TEXT PRIMARY KEY,
  account_id         TEXT NOT NULL REFERENCES accounts(id),
  period             TEXT NOT NULL,
  rule               TEXT NOT NULL,
  title              TEXT NOT NULL,
  detail             TEXT NOT NULL,
  expected           NUMERIC NOT NULL,
  billed             NUMERIC NOT NULL,
  monthly_recoverable NUMERIC NOT NULL,
  annual_recoverable  NUMERIC NOT NULL,
  severity           TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_period ON invoices(period);
CREATE INDEX IF NOT EXISTS idx_findings_period ON findings(period);
