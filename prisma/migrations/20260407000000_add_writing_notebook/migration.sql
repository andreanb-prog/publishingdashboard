-- AlterTable
ALTER TABLE "User" ADD COLUMN "anthropicApiKey" TEXT;
ALTER TABLE "User" ADD COLUMN "anthropicKeyAddedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "writingOnboardingComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WritingNotebook" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT,
    "phase" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "chapterIndex" INTEGER,
    "content" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingNotebook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingNotebook_userId_bookId_idx" ON "WritingNotebook"("userId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "WritingNotebook_userId_bookId_phase_section_chapterIndex_key" ON "WritingNotebook"("userId", "bookId", "phase", "section", "chapterIndex");

-- AddForeignKey
ALTER TABLE "WritingNotebook" ADD CONSTRAINT "WritingNotebook_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "WritingNotebookChat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingNotebookChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WritingNotebookChat_userId_bookId_createdAt_idx" ON "WritingNotebookChat"("userId", "bookId", "createdAt");
