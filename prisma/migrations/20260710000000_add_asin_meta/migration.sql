-- CreateTable
CREATE TABLE "AsinMeta" (
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "blurb" TEXT,
    "isKu" BOOLEAN NOT NULL DEFAULT false,
    "price" DOUBLE PRECISION,
    "reviews" INTEGER,
    "overallBsr" INTEGER,
    "categories" JSONB,
    "tropes" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AsinMeta_pkey" PRIMARY KEY ("asin")
);

-- CreateIndex
CREATE INDEX "AsinMeta_fetchedAt_idx" ON "AsinMeta"("fetchedAt");
