CREATE TYPE "public"."fund_category" AS ENUM('Hisse Senedi', 'Kıymetli Maden', 'Serbest', 'Değişken', 'Para Piyasası', 'Borçlanma');--> statement-breakpoint
CREATE TYPE "public"."holding_direction" AS ENUM('increased', 'decreased');--> statement-breakpoint
CREATE TABLE "category_performance" (
	"category" "fund_category" PRIMARY KEY NOT NULL,
	"y1" numeric(6, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "founders" (
	"name" text PRIMARY KEY NOT NULL,
	"initials" varchar(4) NOT NULL,
	"color" varchar(9) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fund_allocations" (
	"fund_code" varchar(8) NOT NULL,
	"label" text NOT NULL,
	"pct" numeric(5, 2) NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "fund_allocations_fund_code_label_pk" PRIMARY KEY("fund_code","label")
);
--> statement-breakpoint
CREATE TABLE "fund_holdings" (
	"fund_code" varchar(8) NOT NULL,
	"ticker" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"color" varchar(9),
	"weight" numeric(6, 2) NOT NULL,
	"change" numeric(6, 2) NOT NULL,
	"direction" "holding_direction" NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "fund_holdings_fund_code_ticker_pk" PRIMARY KEY("fund_code","ticker")
);
--> statement-breakpoint
CREATE TABLE "fund_metrics" (
	"fund_code" varchar(8) NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"position" smallint NOT NULL,
	CONSTRAINT "fund_metrics_fund_code_label_pk" PRIMARY KEY("fund_code","label")
);
--> statement-breakpoint
CREATE TABLE "fund_similarities" (
	"fund_code" varchar(8) NOT NULL,
	"peer_code" varchar(8) NOT NULL,
	"peer_label" text,
	"similarity" smallint NOT NULL,
	CONSTRAINT "fund_similarities_fund_code_peer_code_pk" PRIMARY KEY("fund_code","peer_code")
);
--> statement-breakpoint
CREATE TABLE "funds" (
	"code" varchar(8) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"founder" text NOT NULL,
	"category" "fund_category" NOT NULL,
	"isin" text,
	"price" numeric(18, 6) NOT NULL,
	"daily" numeric(6, 2) NOT NULL,
	"m1" numeric(6, 2) NOT NULL,
	"y1" numeric(6, 2) NOT NULL,
	"aum" numeric(20, 2) NOT NULL,
	"investors" integer DEFAULT 0 NOT NULL,
	"risk" smallint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_indices" (
	"name" text PRIMARY KEY NOT NULL,
	"symbol" varchar(4) NOT NULL,
	"color" varchar(9) NOT NULL,
	"value" numeric(18, 4) NOT NULL,
	"display_value" text,
	"unit" varchar(8) DEFAULT '' NOT NULL,
	"change" numeric(6, 2) NOT NULL,
	"spark_seed" smallint NOT NULL,
	"position" smallint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fund_allocations" ADD CONSTRAINT "fund_allocations_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_holdings" ADD CONSTRAINT "fund_holdings_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_metrics" ADD CONSTRAINT "fund_metrics_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_similarities" ADD CONSTRAINT "fund_similarities_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_similarities" ADD CONSTRAINT "fund_similarities_peer_code_funds_code_fk" FOREIGN KEY ("peer_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_holdings_fund_idx" ON "fund_holdings" USING btree ("fund_code","direction");