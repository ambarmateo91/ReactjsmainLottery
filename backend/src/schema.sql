CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'seller' CHECK (role IN ('admin', 'seller', 'viewer')),
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilidad con BD ya creadas con el esquema anterior
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
DO $$
BEGIN
  ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS lotteries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  max_tickets INTEGER NOT NULL DEFAULT 0,
  sold_tickets INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  draw_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID NOT NULL REFERENCES lotteries(id) ON DELETE CASCADE,
  prize_type TEXT NOT NULL DEFAULT 'cash',
  prize_name TEXT NOT NULL,
  prize_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 1,
  winning_condition TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lottery_id UUID NOT NULL REFERENCES lotteries(id) ON DELETE RESTRICT,
  ticket_number TEXT UNIQUE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_name TEXT,
  status TEXT NOT NULL DEFAULT 'sold' CHECK (status IN ('sold', 'cancelled', 'pending', 'claimed')),
  sold_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  prize_won NUMERIC(12, 2),
  prize_type TEXT
);

CREATE INDEX IF NOT EXISTS idx_tickets_lottery ON tickets (lottery_id);
CREATE INDEX IF NOT EXISTS idx_tickets_seller ON tickets (seller_id);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON tickets (ticket_number);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
