CREATE TYPE "public"."organization_role" AS ENUM('owner', 'admin', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."trigger_type" AS ENUM('manual', 'webhook', 'cron', 'api');--> statement-breakpoint
CREATE TYPE "public"."log_level" AS ENUM('info', 'warn', 'error', 'debug');--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DEFAULT 'member'::"public"."organization_role";--> statement-breakpoint
ALTER TABLE "organization_members" ALTER COLUMN "role" SET DATA TYPE "public"."organization_role" USING "role"::"public"."organization_role";--> statement-breakpoint
ALTER TABLE "executions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."execution_status";--> statement-breakpoint
ALTER TABLE "executions" ALTER COLUMN "status" SET DATA TYPE "public"."execution_status" USING "status"::"public"."execution_status";--> statement-breakpoint
ALTER TABLE "executions" ALTER COLUMN "trigger_type" SET DATA TYPE "public"."trigger_type" USING "trigger_type"::"public"."trigger_type";--> statement-breakpoint
ALTER TABLE "logs" ALTER COLUMN "level" SET DATA TYPE "public"."log_level" USING "level"::"public"."log_level";