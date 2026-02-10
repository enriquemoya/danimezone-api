ALTER TABLE "catalog_taxonomies"
ADD COLUMN "release_date" DATE;

CREATE INDEX "idx_catalog_taxonomies_release_date"
ON "catalog_taxonomies" ("release_date");
