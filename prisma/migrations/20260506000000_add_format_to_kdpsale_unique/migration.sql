-- Drop old unique constraint (no format)
DROP INDEX IF EXISTS "KdpSale_userId_asin_date_key";

-- Add new unique constraint including format
CREATE UNIQUE INDEX "KdpSale_userId_asin_date_format_key" ON "KdpSale"("userId", "asin", "date", "format");
