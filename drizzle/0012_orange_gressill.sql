CREATE TYPE "public"."kap_report_status" AS ENUM('discovered', 'skipped', 'queued', 'extracted', 'no_detail', 'failed');--> statement-breakpoint
CREATE TABLE "kap_extraction_batches" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"period" date NOT NULL,
	"status" varchar(24) NOT NULL,
	"request_count" integer NOT NULL,
	"collected_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kap_portfolio_reports" (
	"disclosure_index" integer PRIMARY KEY NOT NULL,
	"fund_code" varchar(8) NOT NULL,
	"fund_title" text NOT NULL,
	"period" date NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"status" "kap_report_status" DEFAULT 'discovered' NOT NULL,
	"batch_id" varchar(64),
	"holdings_count" integer,
	"note" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extracted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "kap_extraction_batches_period_idx" ON "kap_extraction_batches" USING btree ("period");--> statement-breakpoint
CREATE INDEX "kap_portfolio_reports_period_idx" ON "kap_portfolio_reports" USING btree ("period","status");--> statement-breakpoint
CREATE INDEX "kap_portfolio_reports_fund_idx" ON "kap_portfolio_reports" USING btree ("fund_code","period");--> statement-breakpoint
CREATE INDEX "kap_portfolio_reports_batch_idx" ON "kap_portfolio_reports" USING btree ("batch_id");