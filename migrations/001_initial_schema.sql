CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pos_event_ack (
  pos_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pos_id, event_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS read_model_inventory (
  product_id TEXT PRIMARY KEY,
  available INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_occurred ON events(occurred_at, event_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_ack_pos ON pos_event_ack(pos_id);
