-- AlterTable
ALTER TABLE "SwapEntry" ADD COLUMN "sourceListId" TEXT;

-- Backfill outbound-send rows synced before this column existed: the BookClicker
-- list id was stashed in notes as "(list NNNNN)".
UPDATE "SwapEntry"
SET "sourceListId" = substring("notes" from '\(list (\d+)\)')
WHERE "role" = 'outbound-send'
  AND "notes" ~ '\(list \d+\)'
  AND "sourceListId" IS NULL;
