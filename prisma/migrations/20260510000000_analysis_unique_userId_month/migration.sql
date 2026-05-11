-- Drop existing index and replace with unique constraint
DROP INDEX IF EXISTS "Analysis_userId_month_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Analysis_userId_month_key" ON "Analysis"("userId", "month");
