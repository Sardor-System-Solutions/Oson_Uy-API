-- CreateTable
CREATE TABLE "project_floor_area_options" (
    "id" SERIAL NOT NULL,
    "project_floor_id" INTEGER NOT NULL,
    "area_sqm" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_floor_area_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_floor_layouts" (
    "id" SERIAL NOT NULL,
    "project_floor_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "title" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_floor_layouts_pkey" PRIMARY KEY ("id")
);

-- Migrate existing floor area and sample image
INSERT INTO "project_floor_area_options" ("project_floor_id", "area_sqm", "sort_order")
SELECT "id", "area_sqm", 0 FROM "project_floors";

INSERT INTO "project_floor_layouts" ("project_floor_id", "image_url", "sort_order", "title")
SELECT "id", "sample_image_url", 0, NULL
FROM "project_floors"
WHERE "sample_image_url" IS NOT NULL AND TRIM("sample_image_url") <> '';

ALTER TABLE "project_floors" DROP COLUMN "area_sqm";
ALTER TABLE "project_floors" DROP COLUMN "sample_image_url";

ALTER TABLE "project_floor_area_options" ADD CONSTRAINT "project_floor_area_options_project_floor_id_fkey" FOREIGN KEY ("project_floor_id") REFERENCES "project_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_floor_layouts" ADD CONSTRAINT "project_floor_layouts_project_floor_id_fkey" FOREIGN KEY ("project_floor_id") REFERENCES "project_floors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "project_floor_area_options_project_floor_id_idx" ON "project_floor_area_options"("project_floor_id");

CREATE INDEX "project_floor_layouts_project_floor_id_idx" ON "project_floor_layouts"("project_floor_id");

ALTER TABLE "leads" DROP CONSTRAINT IF EXISTS "leads_apartmentId_fkey";

DROP INDEX IF EXISTS "leads_apartmentId_idx";

ALTER TABLE "leads" DROP COLUMN IF EXISTS "apartmentId";

DROP TABLE IF EXISTS "apartments";
