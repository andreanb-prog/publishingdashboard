-- CreateTable
CREATE TABLE "ContentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "readerAvatar" TEXT NOT NULL,
    "coreFeelings" JSONB NOT NULL,
    "voiceProfile" TEXT NOT NULL,
    "visualBrief" JSONB NOT NULL,
    "midjourneyStyle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPost" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "phase" TEXT NOT NULL,
    "pillar" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "imagePrompt" TEXT NOT NULL,
    "midjourneyPrompt" TEXT NOT NULL,
    "freepikPrompt" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TailwindConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "accountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TailwindConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentProfile_userId_bookId_idx" ON "ContentProfile"("userId", "bookId");

-- CreateIndex
CREATE INDEX "ContentPost_userId_campaignId_idx" ON "ContentPost"("userId", "campaignId");

-- CreateIndex
CREATE INDEX "ContentPost_userId_bookId_idx" ON "ContentPost"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "TailwindConnection_userId_key" ON "TailwindConnection"("userId");
