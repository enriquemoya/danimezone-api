ALTER TABLE read_model_inventory
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS availability_state TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

UPDATE read_model_inventory
SET
  last_synced_at = COALESCE(last_synced_at, updated_at),
  availability_state = COALESCE(
    availability_state,
    CASE
      WHEN available <= 0 THEN 'SOLD_OUT'
      WHEN available <= 2 THEN 'LOW_STOCK'
      ELSE 'AVAILABLE'
    END
  );
