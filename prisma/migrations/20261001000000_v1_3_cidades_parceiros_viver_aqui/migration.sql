-- v1.3 — Cidades do DF, Parceiros, Viver aqui, blog moderno, histórico de preço, alertas. Idempotente.

CREATE TABLE IF NOT EXISTS "area_insights" (
  "id" TEXT NOT NULL,
  "addressKey" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "data" JSONB,
  "manual" JSONB,
  "provider" TEXT,
  "fetchedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "area_insights_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "area_insights_addressKey_key" ON "area_insights"("addressKey");

CREATE TABLE IF NOT EXISTS "city_pages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tagline" TEXT,
  "summary" TEXT,
  "coverUrl" TEXT,
  "videoUrl" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL DEFAULT 0,
  "raNumber" TEXT,
  "foundedAt" TEXT,
  "founderGovernor" TEXT,
  "population" TEXT,
  "populationSource" TEXT,
  "areaKm2" TEXT,
  "distanceKm" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "matchNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "sections" JSONB,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "ogImageUrl" TEXT,
  "areaInsightId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "city_pages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "city_pages_slug_key" ON "city_pages"("slug");
CREATE INDEX IF NOT EXISTS "city_pages_status_order_idx" ON "city_pages"("status", "order");

CREATE TABLE IF NOT EXISTS "partners" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'OUTRO',
  "tagline" TEXT,
  "summary" TEXT,
  "logoUrl" TEXT,
  "coverUrl" TEXT,
  "benefit" TEXT,
  "website" TEXT,
  "phone" TEXT,
  "whatsapp" TEXT,
  "email" TEXT,
  "address" TEXT,
  "mapEmbedUrl" TEXT,
  "instagram" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "order" INTEGER NOT NULL DEFAULT 0,
  "featured" BOOLEAN NOT NULL DEFAULT false,
  "sections" JSONB,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "empreendimentoIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "partners_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "partners_slug_key" ON "partners"("slug");
CREATE INDEX IF NOT EXISTS "partners_status_type_order_idx" ON "partners"("status", "type", "order");

CREATE TABLE IF NOT EXISTS "property_alerts" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "criteria" JSONB NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'site',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "property_alerts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "property_alerts_active_idx" ON "property_alerts"("active");

ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "sections" JSONB,
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "ogImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "readingMinutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "citySlug" TEXT,
  ADD COLUMN IF NOT EXISTS "series" TEXT,
  ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "blog_posts_citySlug_idx" ON "blog_posts"("citySlug");

ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "priceHistory" JSONB,
  ADD COLUMN IF NOT EXISTS "previousSlugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "areaInsightId" TEXT;

ALTER TABLE "empreendimentos" ADD COLUMN IF NOT EXISTS "areaInsightId" TEXT;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "aiAnalysis" JSONB;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_areaInsightId_fkey') THEN
    ALTER TABLE "properties" ADD CONSTRAINT "properties_areaInsightId_fkey" FOREIGN KEY ("areaInsightId") REFERENCES "area_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empreendimentos_areaInsightId_fkey') THEN
    ALTER TABLE "empreendimentos" ADD CONSTRAINT "empreendimentos_areaInsightId_fkey" FOREIGN KEY ("areaInsightId") REFERENCES "area_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'city_pages_areaInsightId_fkey') THEN
    ALTER TABLE "city_pages" ADD CONSTRAINT "city_pages_areaInsightId_fkey" FOREIGN KEY ("areaInsightId") REFERENCES "area_insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
