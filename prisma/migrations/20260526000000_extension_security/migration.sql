-- CreateTable
CREATE TABLE "ConnectionToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    CONSTRAINT "ConnectionToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionSyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataPoints" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    CONSTRAINT "ExtensionSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtensionRateLimit" (
    "id" TEXT NOT NULL,
    "extensionKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ExtensionRateLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConnectionToken_token_key" ON "ConnectionToken"("token");

-- CreateIndex
CREATE INDEX "ConnectionToken_userId_idx" ON "ConnectionToken"("userId");

-- CreateIndex
CREATE INDEX "ExtensionSyncLog_userId_idx" ON "ExtensionSyncLog"("userId");

-- CreateIndex
CREATE INDEX "ExtensionSyncLog_userId_platform_idx" ON "ExtensionSyncLog"("userId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ExtensionRateLimit_extensionKey_windowStart_key" ON "ExtensionRateLimit"("extensionKey", "windowStart");

-- AddForeignKey
ALTER TABLE "ConnectionToken" ADD CONSTRAINT "ConnectionToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtensionSyncLog" ADD CONSTRAINT "ExtensionSyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
