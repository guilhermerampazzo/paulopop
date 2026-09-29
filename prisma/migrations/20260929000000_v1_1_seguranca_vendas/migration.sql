-- v1.1 (29/09/2026): varandas, venda/locação concluída, senha do relatório, rastreamento e páginas legais.
-- Idempotente: só adiciona colunas.
ALTER TABLE "properties"
  ADD COLUMN IF NOT EXISTS "balconies" INTEGER,
  ADD COLUMN IF NOT EXISTS "soldAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "listPriceAtSale" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "salePrice" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "saleDiscountPct" DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS "saleDiscountValue" DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS "saleSource" TEXT,
  ADD COLUMN IF NOT EXISTS "saleNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "showSalePrice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "daysOnMarket" INTEGER,
  ADD COLUMN IF NOT EXISTS "reportPasswordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "reportPasswordSetAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "properties_status_soldAt_idx" ON "properties"("status", "soldAt");

ALTER TABLE "site_config"
  ADD COLUMN IF NOT EXISTS "ga4Id" TEXT,
  ADD COLUMN IF NOT EXISTS "metaPixelId" TEXT,
  ADD COLUMN IF NOT EXISTS "gtmId" TEXT,
  ADD COLUMN IF NOT EXISTS "privacyPolicy" TEXT,
  ADD COLUMN IF NOT EXISTS "termsOfUse" TEXT,
  ADD COLUMN IF NOT EXISTS "businessHours" TEXT,
  ADD COLUMN IF NOT EXISTS "googleBusinessUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "mapEmbedUrl" TEXT;
