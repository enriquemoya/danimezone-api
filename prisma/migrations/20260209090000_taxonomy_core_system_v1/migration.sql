-- Add taxonomy hierarchy + labels
ALTER TABLE "catalog_taxonomies" ADD COLUMN "parent_id" UUID;
ALTER TABLE "catalog_taxonomies" ADD COLUMN "labels" JSONB;

-- Add game_id to read model
ALTER TABLE "read_model_inventory" ADD COLUMN "game_id" UUID;

-- Indexes
CREATE INDEX "idx_catalog_taxonomies_parent" ON "catalog_taxonomies"("parent_id");
CREATE INDEX "idx_read_model_category_id" ON "read_model_inventory"("category_id");
CREATE INDEX "idx_read_model_game_id" ON "read_model_inventory"("game_id");

-- Ensure misc category exists and backfill category_id
WITH misc AS (
  INSERT INTO "catalog_taxonomies" ("id", "type", "name", "slug", "description", "labels", "created_at", "updated_at")
  VALUES (gen_random_uuid(), 'CATEGORY', 'Misc', 'misc', NULL, '{"es":"Miscelaneo","en":"Misc"}'::jsonb, NOW(), NOW())
  ON CONFLICT ("slug") DO UPDATE SET "updated_at" = EXCLUDED."updated_at"
  RETURNING "id"
)
UPDATE "read_model_inventory"
SET "category_id" = (SELECT "id" FROM misc)
WHERE "category_id" IS NULL;

-- Backfill game_id using taxonomy slugs
UPDATE "read_model_inventory" AS r
SET "game_id" = t."id"
FROM "catalog_taxonomies" AS t
WHERE t."type" = 'GAME'
  AND t."slug" = r."game"
  AND r."game_id" IS NULL;
