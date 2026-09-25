-- v1.0: importação de anúncios da RE/MAX e ficha no padrão RE/MAX
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "extraFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "constructionMonth" INTEGER;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourcePortal" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourceId" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourceAgentName" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "sourceOfficeName" TEXT;
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "importedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "properties_sourceId_key" ON "properties"("sourceId");
