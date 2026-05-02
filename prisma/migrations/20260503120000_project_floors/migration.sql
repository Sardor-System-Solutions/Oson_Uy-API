-- CreateTable
CREATE TABLE "project_floors" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "floor" INTEGER NOT NULL,
    "price_per_m2" DOUBLE PRECISION NOT NULL,
    "area_sqm" DOUBLE PRECISION NOT NULL,
    "sample_image_url" TEXT,
    "title" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_floors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_floors_projectId_floor_key" ON "project_floors"("projectId", "floor");

-- CreateIndex
CREATE INDEX "project_floors_projectId_idx" ON "project_floors"("projectId");

-- AddForeignKey
ALTER TABLE "project_floors" ADD CONSTRAINT "project_floors_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "floor_id" INTEGER;

-- CreateIndex
CREATE INDEX "leads_floor_id_idx" ON "leads"("floor_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "project_floors"("id") ON DELETE SET NULL ON UPDATE CASCADE;
