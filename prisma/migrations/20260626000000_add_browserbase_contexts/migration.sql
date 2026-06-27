-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bookclickerConnectedAt" TIMESTAMP(3),
ADD COLUMN     "bookclickerContextId" TEXT,
ADD COLUMN     "bookclickerLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "bookclickerSyncStatus" TEXT,
ADD COLUMN     "kdpConnectedAt" TIMESTAMP(3),
ADD COLUMN     "kdpContextId" TEXT,
ADD COLUMN     "kdpLastSyncAt" TIMESTAMP(3),
ADD COLUMN     "kdpSyncStatus" TEXT;

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "rowsFetched" INTEGER,
    "errorType" TEXT,
    "errorDetail" TEXT,
    "sessionId" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncLog_userId_idx" ON "SyncLog"("userId");

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

