INSERT INTO read_model_inventory (product_id, available, updated_at)
VALUES
  ('prod-001', 10, NOW()),
  ('prod-002', 2, NOW()),
  ('prod-003', 0, NOW()),
  ('prod-004', 25, NOW()),
  ('prod-005', 1, NOW())
ON CONFLICT (product_id) DO NOTHING;
