-- CreateTable
CREATE TABLE "MarketPulseSnapshot" (
    "id" TEXT NOT NULL,
    "genreSlug" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rows" JSONB NOT NULL,
    "stats" JSONB,

    CONSTRAINT "MarketPulseSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketPulseSnapshot_genreSlug_capturedAt_idx" ON "MarketPulseSnapshot"("genreSlug", "capturedAt");
