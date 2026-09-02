CREATE TYPE "public"."ingest_status" AS ENUM('running', 'success', 'failed');--> statement-breakpoint
CREATE TABLE "fund_daily_stats" (
	"fund_code" varchar(8) NOT NULL,
	"date" date NOT NULL,
	"price" numeric(18, 6) NOT NULL,
	"total_value" numeric(20, 2),
	"investor_count" integer,
	"share_count" numeric(24, 2),
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_daily_stats_fund_code_date_pk" PRIMARY KEY("fund_code","date")
);
--> statement-breakpoint
CREATE TABLE "ingest_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" varchar(40) NOT NULL,
	"status" "ingest_status" NOT NULL,
	"params" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"rows_written" integer DEFAULT 0 NOT NULL,
	"rows_read" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "funds" ADD COLUMN "tefas_type_code" varchar(16);--> statement-breakpoint
ALTER TABLE "funds" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "funds" ADD COLUMN "source" varchar(16) DEFAULT 'fixture' NOT NULL;--> statement-breakpoint
ALTER TABLE "fund_daily_stats" ADD CONSTRAINT "fund_daily_stats_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_daily_stats_date_idx" ON "fund_daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "fund_daily_stats_fund_date_idx" ON "fund_daily_stats" USING btree ("fund_code","date");--> statement-breakpoint
CREATE INDEX "ingest_runs_job_idx" ON "ingest_runs" USING btree ("job","started_at");