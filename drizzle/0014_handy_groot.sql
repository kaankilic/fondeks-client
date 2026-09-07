ALTER TABLE "funds" ALTER COLUMN "withholding_tax" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "funds" ALTER COLUMN "risk" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "funds" ALTER COLUMN "buy_value_days" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "funds" ALTER COLUMN "sell_value_days" DROP NOT NULL;--> statement-breakpoint
-- Rows the catalogue feed wrote carry the placeholders the ingest used to
-- default to — 0% stopaj, risk 4, T+1 / T+2. No source ever published them, so
-- they are cleared rather than left standing as fact. Fixture rows, whose
-- values are authored by hand, keep theirs.
UPDATE "funds"
   SET "withholding_tax" = NULL,
       "risk" = NULL,
       "buy_value_days" = NULL,
       "sell_value_days" = NULL
 WHERE "source" <> 'fixture';
