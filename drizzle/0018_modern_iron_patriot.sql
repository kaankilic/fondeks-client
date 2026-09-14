CREATE TABLE "fund_disclosures" (
	"disclosure_index" integer PRIMARY KEY NOT NULL,
	"fund_code" varchar(8) NOT NULL,
	"fund_title" text NOT NULL,
	"subject" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"is_late" boolean DEFAULT false NOT NULL,
	"disclosure_url" text NOT NULL,
	"pdf_url" text,
	"pdf_name" text,
	"attachment_count" integer DEFAULT 0 NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fund_disclosures" ADD CONSTRAINT "fund_disclosures_fund_code_funds_code_fk" FOREIGN KEY ("fund_code") REFERENCES "public"."funds"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fund_disclosures_fund_idx" ON "fund_disclosures" USING btree ("fund_code","published_at");--> statement-breakpoint
CREATE INDEX "fund_disclosures_subject_idx" ON "fund_disclosures" USING btree ("fund_code","subject");--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_url_unique" UNIQUE("url");