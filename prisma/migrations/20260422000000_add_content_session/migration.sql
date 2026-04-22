-- CreateTable
CREATE TABLE "ContentSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "pinterestUrl" TEXT,
    "visualBrief" JSONB,
    "midjourneyStyleString" TEXT,
    "profileId" TEXT,
    "campaignId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentSession_userId_key" ON "ContentSession"("userId");
