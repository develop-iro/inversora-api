-- AlterTable
ALTER TABLE "funds" ADD COLUMN "badge" TEXT NOT NULL DEFAULT '';
ALTER TABLE "funds" ADD COLUMN "themeLabel" TEXT NOT NULL DEFAULT '';
ALTER TABLE "funds" ADD COLUMN "idealForBeginners" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "funds_idealForBeginners_idx" ON "funds"("idealForBeginners");

-- Backfill editorial copy from MVP featured-funds curation (Spanish, es locale).
UPDATE "funds" SET "themeLabel" = 'Multisector global', "badge" = 'Ideal para empezar', "idealForBeginners" = true
WHERE "isin" = 'IE00B4L5Y983';

UPDATE "funds" SET "themeLabel" = 'Tecnología y mega caps', "badge" = 'Núcleo de cartera', "idealForBeginners" = true
WHERE "isin" = 'IE00B5BMR087';

UPDATE "funds" SET "themeLabel" = 'Renovables y ESG', "badge" = 'Filtro calidad ESG', "idealForBeginners" = false
WHERE "isin" = 'LU1781541179';

UPDATE "funds" SET "themeLabel" = 'Multiactivo equilibrado', "badge" = 'Volatilidad contenida', "idealForBeginners" = true
WHERE "isin" = 'IE00BYVJRP78';

UPDATE "funds" SET "themeLabel" = 'Referencia S&P 500', "badge" = 'Núcleo USA', "idealForBeginners" = true
WHERE "isin" = 'US78462F1030';

-- Derive idealForBeginners for funds without curated editorial copy (RN product rules).
UPDATE "funds"
SET "idealForBeginners" = (
  "score" IS NOT NULL
  AND "score" >= 70
  AND ("riskLevel" IS NULL OR "riskLevel" <= 5)
  AND ("ter" IS NULL OR "ter" <= 0.5)
)
WHERE "badge" = '' AND "themeLabel" = '';
