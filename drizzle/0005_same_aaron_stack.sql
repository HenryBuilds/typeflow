CREATE TYPE "public"."debug_session_status" AS ENUM('active', 'paused', 'completed', 'terminated');--> statement-breakpoint
CREATE TABLE "debug_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"workflow_id" uuid NOT NULL,
	"status" "debug_session_status" DEFAULT 'active' NOT NULL,
	"current_node_id" uuid,
	"next_node_ids" jsonb DEFAULT '[]'::jsonb,
	"node_results" jsonb,
	"node_outputs" jsonb,
	"breakpoints" jsonb DEFAULT '[]'::jsonb,
	"call_stack" jsonb DEFAULT '[]'::jsonb,
	"trigger_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "debug_sessions" ADD CONSTRAINT "debug_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debug_sessions" ADD CONSTRAINT "debug_sessions_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;