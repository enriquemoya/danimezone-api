DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CatalogTaxonomyType') THEN
    CREATE TYPE "CatalogTaxonomyType" AS ENUM ('CATEGORY', 'GAME', 'EXPANSION', 'OTHER');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS catalog_taxonomies (
  id UUID PRIMARY KEY,
  type "CatalogTaxonomyType" NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalog_taxonomies_type ON catalog_taxonomies(type);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id UUID PRIMARY KEY,
  product_id TEXT NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_product ON inventory_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_actor ON inventory_adjustments(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_created ON inventory_adjustments(created_at);
