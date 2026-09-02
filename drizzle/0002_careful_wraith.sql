DROP TABLE "fund_holdings" CASCADE;--> statement-breakpoint
DROP TABLE "fund_metrics" CASCADE;--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "price";--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "daily";--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "m1";--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "y1";--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "aum";--> statement-breakpoint
ALTER TABLE "funds" DROP COLUMN "investors";--> statement-breakpoint
DROP TYPE "public"."holding_direction";