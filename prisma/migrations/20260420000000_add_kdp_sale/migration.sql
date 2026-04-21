-- CreateTable
CREATE TABLE "KdpSale" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,
    "kenp" INTEGER NOT NULL DEFAULT 0,
    "royalties" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "format" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KdpSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KdpSale_userId_asin_date_key" ON "KdpSale"("userId", "asin", "date");

-- CreateIndex
CREATE INDEX "KdpSale_userId_idx" ON "KdpSale"("userId");

-- CreateIndex
CREATE INDEX "KdpSale_userId_date_idx" ON "KdpSale"("userId", "date");
