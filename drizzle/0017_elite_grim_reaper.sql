ALTER TABLE "funds" ALTER COLUMN "on_tefas" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "funds" ALTER COLUMN "on_tefas" DROP NOT NULL;--> statement-breakpoint
-- Under the old mapping an unknown `tefasDurum` was written as `true`, so a
-- row's `true` may be the platform's answer or may be a guess, and the two are
-- no longer distinguishable. Clearing what the feed wrote lets the next
-- catalogue sync restate only what the source actually says; until it runs the
-- badge is absent rather than wrong. Fixture rows are authored by hand.
UPDATE "funds" SET "on_tefas" = NULL WHERE "source" <> 'fixture';--> statement-breakpoint
-- TEFAS reports `kisiSayisi: 0` for every ETF because nobody counts holders of
-- a fund held in brokerage accounts. Stored zeroes read as "no investors".
UPDATE "fund_daily_stats" d
   SET "investor_count" = NULL
  FROM "funds" f
 WHERE f."code" = d."fund_code"
   AND f."fund_type" = 'BYF'
   AND d."investor_count" = 0;
