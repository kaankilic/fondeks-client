CREATE TABLE "fund_holding_snapshots" (
	"fund_code" varchar(8) NOT NULL,
	"period" date NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"weight" numeric(6, 2) NOT NULL,
	"source" varchar(16) DEFAULT 'fixture' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fund_holding_snapshots_fund_code_period_ticker_pk" PRIMARY KEY("fund_code","period","ticker")
);
--> statement-breakpoint
CREATE TABLE "index_quotes" (
	"index_name" text NOT NULL,
	"date" date NOT NULL,
	"value" numeric(18, 4) NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "index_quotes_index_name_date_pk" PRIMARY KEY("index_name","date")
);
--> statement-breakpoint
ALTER TABLE "market_indices" ADD COLUMN "display_pattern" varchar(16);--> statement-breakpoint
ALTER TABLE "market_indices" ADD COLUMN "source" varchar(16) DEFAULT 'fixture' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_indices" ADD COLUMN "source_symbol" varchar(32);--> statement-breakpoint
ALTER TABLE "market_indices" ADD COLUMN "decimals" smallint DEFAULT 2 NOT NULL;--> statement-breakpoint
ALTER TABLE "market_indices" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "fund_holding_snapshots" ADD CONSTRAINT "fund_holding_snapshots_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "index_quotes" ADD CONSTRAINT "index_quotes_index_name_market_indices_name_fk" FOREIGN KEY ("index_name") REFERENCES "public"."market_indices"("name") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_holding_snapshots_period_idx" ON "fund_holding_snapshots" USING btree ("period");--> statement-breakpoint
CREATE INDEX "index_quotes_date_idx" ON "index_quotes" USING btree ("date");