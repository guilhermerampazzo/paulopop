-- v1.2: hub de empreendimentos (blocos, tipologias, unidades, estágio) e estudo de mercado. Idempotente.
ALTER TABLE "empreendimentos"
  ADD COLUMN IF NOT EXISTS "stage" TEXT NOT NULL DEFAULT 'ENTREGUE',
  ADD COLUMN IF NOT EXISTS "deliveryYear" INTEGER,
  ADD COLUMN IF NOT EXISTS "builder" TEXT,
  ADD COLUMN IF NOT EXISTS "elevators" INTEGER,
  ADD COLUMN IF NOT EXISTS "condoFeeAvg" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "petsAllowed" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "rules" TEXT;

CREATE TABLE IF NOT EXISTS "empreendimento_blocks" (
  "id" TEXT PRIMARY KEY,
  "empreendimentoId" TEXT NOT NULL REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "floors" INTEGER NOT NULL DEFAULT 1,
  "unitsPerFloor" INTEGER NOT NULL DEFAULT 4,
  "firstFloor" INTEGER NOT NULL DEFAULT 1,
  "numbering" TEXT NOT NULL DEFAULT 'FLOOR_SEQ',
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "empreendimento_unit_types" (
  "id" TEXT PRIMARY KEY,
  "empreendimentoId" TEXT NOT NULL REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "name" TEXT NOT NULL,
  "bedrooms" INTEGER,
  "suites" INTEGER,
  "bathrooms" INTEGER,
  "area" DECIMAL(10,2),
  "parking" INTEGER,
  "sunPosition" TEXT,
  "floorPlanUrl" TEXT,
  "finals" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "empreendimento_units" (
  "id" TEXT PRIMARY KEY,
  "empreendimentoId" TEXT NOT NULL REFERENCES "empreendimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "blockId" TEXT NOT NULL REFERENCES "empreendimento_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "floor" INTEGER NOT NULL,
  "number" TEXT NOT NULL,
  "unitTypeId" TEXT REFERENCES "empreendimento_unit_types"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "notes" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "empreendimento_units_blockId_number_key" ON "empreendimento_units"("blockId", "number");
CREATE INDEX IF NOT EXISTS "empreendimento_units_empreendimentoId_idx" ON "empreendimento_units"("empreendimentoId");

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "unitId" TEXT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_unitId_fkey') THEN
    ALTER TABLE "properties" ADD CONSTRAINT "properties_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "empreendimento_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "market_studies" (
  "id" TEXT PRIMARY KEY,
  "agentId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "propertyId" TEXT REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "title" TEXT NOT NULL,
  "preparedFor" TEXT, "ownerEmail" TEXT, "ownerPhone" TEXT,
  "studyDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "radiusKm" DECIMAL(5,2), "intro" TEXT, "methodology" TEXT,
  "advertiser" TEXT, "address" TEXT, "neighborhood" TEXT, "city" TEXT, "state" TEXT, "zipCode" TEXT,
  "latitude" DECIMAL(10,7), "longitude" DECIMAL(10,7),
  "propertyType" TEXT, "purpose" TEXT, "transactionType" TEXT DEFAULT 'SALE',
  "areaPrivate" DECIMAL(10,2), "areaTotal" DECIMAL(10,2),
  "bedrooms" INTEGER, "suites" INTEGER, "bathrooms" INTEGER, "parking" INTEGER, "parkingType" TEXT,
  "floor" TEXT, "buildingFloors" INTEGER, "elevator" BOOLEAN, "sunPosition" TEXT, "condition" TEXT,
  "renovation" TEXT, "renovationNotes" TEXT, "age" INTEGER, "condoFee" DECIMAL(10,2), "iptu" DECIMAL(10,2),
  "leisure" TEXT, "demand" TEXT, "demandNotes" TEXT, "finishes" JSONB, "notes" TEXT, "photos" JSONB,
  "competitivePct" DECIMAL(5,2) NOT NULL DEFAULT 15, "optimisticPct" DECIMAL(5,2) NOT NULL DEFAULT 10, "outlierPct" DECIMAL(5,2) NOT NULL DEFAULT 30,
  "scenario" TEXT NOT NULL DEFAULT 'MARKET', "adjustPct" DECIMAL(6,2), "adjustNote" TEXT, "results" JSONB,
  "publicToken" TEXT, "tokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "market_studies_publicToken_key" ON "market_studies"("publicToken");
CREATE INDEX IF NOT EXISTS "market_studies_agentId_status_idx" ON "market_studies"("agentId", "status");

CREATE TABLE IF NOT EXISTS "market_study_samples" (
  "id" TEXT PRIMARY KEY,
  "studyId" TEXT NOT NULL REFERENCES "market_studies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "order" INTEGER NOT NULL DEFAULT 0,
  "portal" TEXT, "url" TEXT, "advertiser" TEXT, "location" TEXT,
  "sameCondo" BOOLEAN NOT NULL DEFAULT false,
  "price" DECIMAL(15,2), "areaPrivate" DECIMAL(10,2), "areaTotal" DECIMAL(10,2),
  "bedrooms" INTEGER, "bathrooms" INTEGER, "parking" INTEGER, "floor" TEXT, "sunPosition" TEXT, "renovation" TEXT,
  "condoFee" DECIMAL(10,2), "age" INTEGER, "distanceKm" DECIMAL(6,2), "publishedAt" TIMESTAMP(3), "daysListed" INTEGER,
  "photoUrl" TEXT, "finishes" JSONB, "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'VALID', "discardReason" TEXT, "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "latitude" DECIMAL(10,7), "longitude" DECIMAL(10,7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "market_study_samples_studyId_idx" ON "market_study_samples"("studyId");
