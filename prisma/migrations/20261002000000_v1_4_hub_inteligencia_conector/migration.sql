-- v1.4 — Hub do corretor, preço/m² editável por imóvel, tipologias completas, Área de Inteligência,
-- banco de amostras, pesquisa de amostras e conector do Claude (MCP). Só adiciona; idempotente.

-- Corretor: nome público e vínculo
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "publicName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "companyRole" TEXT;

-- Imóvel: preço/m² comparado editável e importação de portais
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sqmCompareMode" TEXT NOT NULL DEFAULT 'AUTO';
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sqmRefValue" DECIMAL(10,2);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sqmRefLabel" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sqmRefNote" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourcePhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "publishAuthConfirmedAt" TIMESTAMP(3);
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "publishAuthConfirmedBy" TEXT;

-- Tipologias
ALTER TABLE "empreendimento_unit_types" ADD COLUMN IF NOT EXISTS "floorsLabel" TEXT;
ALTER TABLE "empreendimento_unit_types" ADD COLUMN IF NOT EXISTS "totalArea" DECIMAL(10,2);
ALTER TABLE "empreendimento_unit_types" ADD COLUMN IF NOT EXISTS "balconies" INTEGER;
ALTER TABLE "empreendimento_unit_types" ADD COLUMN IF NOT EXISTS "priceFrom" DECIMAL(15,2);
ALTER TABLE "empreendimento_unit_types" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Estudo de mercado: pesquisa de amostras
ALTER TABLE "market_studies" ADD COLUMN IF NOT EXISTS "searchStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "market_studies" ADD COLUMN IF NOT EXISTS "targetSamples" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "market_studies" ADD COLUMN IF NOT EXISTS "searchParams" JSONB;
ALTER TABLE "market_studies" ADD COLUMN IF NOT EXISTS "searchCursor" JSONB;

-- Banco de amostras
CREATE TABLE IF NOT EXISTS "sample_bank" (
  "id" TEXT NOT NULL,
  "urlKey" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "portal" TEXT,
  "externalId" TEXT,
  "title" TEXT,
  "advertiser" TEXT,
  "location" TEXT,
  "city" TEXT,
  "neighborhood" TEXT,
  "quadra" TEXT,
  "price" DECIMAL(15,2),
  "areaPrivate" DECIMAL(10,2),
  "areaTotal" DECIMAL(10,2),
  "bedrooms" INTEGER,
  "suites" INTEGER,
  "bathrooms" INTEGER,
  "parking" INTEGER,
  "floor" TEXT,
  "condoFee" DECIMAL(10,2),
  "publishedAt" TIMESTAMP(3),
  "photoUrl" TEXT,
  "sourceText" TEXT,
  "priceHistory" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sample_bank_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "sample_bank_urlKey_key" ON "sample_bank"("urlKey");
CREATE INDEX IF NOT EXISTS "sample_bank_city_quadra_idx" ON "sample_bank"("city", "quadra");
CREATE INDEX IF NOT EXISTS "sample_bank_portal_idx" ON "sample_bank"("portal");

-- Amostras do estudo: origem, candidatura e prova da coleta
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "origin" TEXT NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "candidateStatus" TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "rejectedReason" TEXT;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "foundAtStep" TEXT;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "foundAtQuadra" TEXT;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "collectedAt" TIMESTAMP(3);
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "sourceText" TEXT;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "altUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "suites" INTEGER;
ALTER TABLE "market_study_samples" ADD COLUMN IF NOT EXISTS "bankId" TEXT;
DO $$ BEGIN
  ALTER TABLE "market_study_samples" ADD CONSTRAINT "market_study_samples_bankId_fkey"
    FOREIGN KEY ("bankId") REFERENCES "sample_bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Área de Inteligência: endereços por quadra e observações por região
CREATE TABLE IF NOT EXISTS "intel_quadras" (
  "id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "sector" TEXT,
  "series" INTEGER,
  "quadra" TEXT NOT NULL,
  "prefix" TEXT,
  "number" INTEGER,
  "type" TEXT,
  "searchTerms" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "mapX" INTEGER,
  "mapY" INTEGER,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "notes" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intel_quadras_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "intel_quadras_city_quadra_key" ON "intel_quadras"("city", "quadra");
CREATE INDEX IF NOT EXISTS "intel_quadras_city_number_idx" ON "intel_quadras"("city", "number");

CREATE TABLE IF NOT EXISTS "intel_region_notes" (
  "id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "series" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  "confirmed" TEXT,
  "market" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "intel_region_notes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "intel_region_notes_city_name_key" ON "intel_region_notes"("city", "name");

-- Histórico de buscas do estudo
CREATE TABLE IF NOT EXISTS "study_search_runs" (
  "id" TEXT NOT NULL,
  "studyId" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'MCP',
  "step" TEXT,
  "quadra" TEXT,
  "portal" TEXT,
  "query" TEXT,
  "found" INTEGER NOT NULL DEFAULT 0,
  "read" INTEGER NOT NULL DEFAULT 0,
  "registered" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "study_search_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "study_search_runs_studyId_createdAt_idx" ON "study_search_runs"("studyId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "study_search_runs" ADD CONSTRAINT "study_search_runs_studyId_fkey"
    FOREIGN KEY ("studyId") REFERENCES "market_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tokens do conector do Claude
CREATE TABLE IF NOT EXISTS "api_tokens" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "api_tokens_tokenHash_key" ON "api_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "api_tokens_userId_idx" ON "api_tokens"("userId");
DO $$ BEGIN
  ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
