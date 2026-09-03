--> Hand-ordered: drizzle-kit emitted the primary key before the column it
--> references, and a NOT NULL column cannot be added to populated rows. The
--> existing rows carry no date and are one `yarn ingest allocations` away from
--> being rebuilt, so they are cleared rather than back-dated to a guess.
DELETE FROM "fund_allocations";--> statement-breakpoint
ALTER TABLE "fund_allocations" DROP CONSTRAINT "fund_allocations_fund_code_label_pk";--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD COLUMN "date" date NOT NULL;--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_fund_code_date_label_pk" PRIMARY KEY("fund_code","date","label");--> statement-breakpoint
CREATE INDEX "fund_allocations_lookup_idx" ON "fund_allocations" USING btree ("fund_code","date");
