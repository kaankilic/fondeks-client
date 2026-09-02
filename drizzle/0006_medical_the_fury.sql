CREATE TABLE "guides" (
	"slug" varchar(80) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"category" text NOT NULL,
	"reading_minutes" smallint NOT NULL,
	"body" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL
);
