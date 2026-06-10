-- TeslaTrack — Database Schema
-- Run this once in your PostgreSQL database (Neon, Supabase, etc.)
-- to set up the required tables.

CREATE TABLE IF NOT EXISTS packages (
  code             TEXT        PRIMARY KEY,
  status           TEXT        NOT NULL DEFAULT 'Processing',
  eta              TEXT        NOT NULL DEFAULT 'Estimating…',
  origin           TEXT        NOT NULL,
  destination      TEXT        NOT NULL,
  carrier          TEXT        NOT NULL DEFAULT 'Tesla Express',
  weight           TEXT        NOT NULL DEFAULT '—',
  speed_kph        NUMERIC     NOT NULL DEFAULT 80,
  start_progress   NUMERIC     NOT NULL DEFAULT 0.05,
  route            JSONB       NOT NULL DEFAULT '[]',
  sender_name      TEXT        DEFAULT '',
  sender_email     TEXT        DEFAULT '',
  sender_phone     TEXT        DEFAULT '',
  sender_address   TEXT        DEFAULT '',
  receiver_name    TEXT        DEFAULT '',
  receiver_email   TEXT        DEFAULT '',
  receiver_phone   TEXT        DEFAULT '',
  receiver_address TEXT        DEFAULT '',
  delivery_method  TEXT        DEFAULT 'Standard',
  shipping_cost    NUMERIC     DEFAULT 0,
  customs_status   TEXT        DEFAULT 'Pending',
  customs_fee      NUMERIC     DEFAULT 0,
  cargo_type       TEXT        DEFAULT 'road',
  notes            TEXT        DEFAULT '',
  paused           BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS package_events (
  id         SERIAL      PRIMARY KEY,
  code       TEXT        REFERENCES packages(code) ON DELETE CASCADE,
  time_label TEXT        DEFAULT '',
  label      TEXT        NOT NULL,
  location   TEXT        DEFAULT '',
  done       BOOLEAN     DEFAULT false,
  sort_order INTEGER     DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL      PRIMARY KEY,
  email      TEXT        NOT NULL,
  code       TEXT        REFERENCES packages(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, code)
);
