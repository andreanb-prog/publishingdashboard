-- AlterTable
-- Per-format royalty split (KU / eBook / Paperback / Hardcover / Audiobook),
-- parsed from KDP's downloadable "Prior Month's Royalties" report. Stored as
-- JSON on the existing ALL_BOOKS browserbase month row so aggregateKdp()'s
-- money math stays untouched (no new sentinel rows = no double counting).
ALTER TABLE "KdpSale" ADD COLUMN "formatBreakdown" JSONB;
