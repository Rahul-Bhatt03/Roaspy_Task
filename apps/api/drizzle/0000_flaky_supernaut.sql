CREATE TYPE "public"."batch_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."url_check_status" AS ENUM('pending', 'in_progress', 'success', 'failed', 'skipped');--> statement-breakpoint
CREATE TABLE "batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "batch_status" DEFAULT 'pending' NOT NULL,
	"total_urls" integer DEFAULT 0 NOT NULL,
	"completed_urls" integer DEFAULT 0 NOT NULL,
	"failed_urls" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "url_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status" "url_check_status" DEFAULT 'pending' NOT NULL,
	"http_status" integer,
	"response_time" integer,
	"page_title" text,
	"error" text,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "url_checks" ADD CONSTRAINT "url_checks_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "url_checks_batch_id_idx" ON "url_checks" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "url_checks_url_idx" ON "url_checks" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "url_checks_batch_id_url_unique" ON "url_checks" USING btree ("batch_id","url");