-- AlterTable
ALTER TABLE "developers" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "legal_address" TEXT,
ADD COLUMN     "office_address" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logo_url" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "materials" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "has_installment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "building_count" INTEGER,
ADD COLUMN     "corpus_count" INTEGER,
ADD COLUMN     "ceiling_height_m" DOUBLE PRECISION,
ADD COLUMN     "has_surface_parking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "has_underground_parking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "surface_parking_spaces" INTEGER,
ADD COLUMN     "underground_parking_spaces" INTEGER,
ADD COLUMN     "elevators_count" INTEGER,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;
