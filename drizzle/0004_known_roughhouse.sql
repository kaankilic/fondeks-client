CREATE TYPE "public"."news_source" AS ENUM('haber', 'kap');--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "news_source" NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"symbol" varchar(10),
	"publisher" text,
	"url" text,
	"published_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "news_published_idx" ON "news" USING btree ("published_at");