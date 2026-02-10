ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS featured_order INTEGER;

ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS slug TEXT;

ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS price NUMERIC;

ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS game TEXT;
