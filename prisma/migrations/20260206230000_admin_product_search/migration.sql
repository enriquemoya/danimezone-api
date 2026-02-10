DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CatalogEntityType') THEN
    CREATE TYPE "CatalogEntityType" AS ENUM ('PRODUCT', 'TAXONOMY');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CatalogAction') THEN
    CREATE TYPE "CatalogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
  END IF;
END$$;

ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS rarity TEXT,
  ADD COLUMN IF NOT EXISTS tags JSONB,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS expansion_id UUID;

CREATE TABLE IF NOT EXISTS catalog_audit_logs (
  id UUID PRIMARY KEY,
  entity_type "CatalogEntityType" NOT NULL,
  entity_id TEXT NOT NULL,
  action "CatalogAction" NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_audit_entity ON catalog_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_actor ON catalog_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_audit_created ON catalog_audit_logs(created_at);
