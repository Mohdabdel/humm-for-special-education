CREATE TYPE "public"."goal_human_approval_status" AS ENUM('pending', 'approved', 'approved_with_conditions', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."goal_need_relationship_type" AS ENUM('directly_addresses', 'partially_addresses', 'supports');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('draft', 'in_review', 'approved', 'active', 'paused', 'generalization_pending', 'generalized', 'revised', 'closed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('academic', 'communication', 'behavior', 'functional', 'adaptive', 'vocational', 'transition', 'therapy', 'self_determination');--> statement-breakpoint
CREATE TYPE "public"."need_priority_basis" AS ENUM('assessment', 'learner_priority', 'family_priority', 'team_decision', 'transition_requirement', 'safety');--> statement-breakpoint
CREATE TYPE "public"."need_priority_level" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."need_source_confidence" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."need_status" AS ENUM('draft', 'active', 'addressed_by_goal', 'addressed_by_support', 'monitor', 'deferred', 'resolved', 'archived');--> statement-breakpoint
CREATE TYPE "public"."need_type" AS ENUM('skill_gap', 'access_barrier', 'environmental_barrier', 'communication', 'behavior', 'functional', 'vocational', 'transition', 'safety', 'assessment_gap');--> statement-breakpoint
CREATE TABLE "goal" (
	"goal_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"domain_id" uuid,
	"goal_type" "goal_type" NOT NULL,
	"title" text NOT NULL,
	"status" "goal_status" DEFAULT 'draft' NOT NULL,
	"owner_team_member_id" uuid NOT NULL,
	"start_date" date,
	"target_date" date,
	"review_date" date,
	"observable_behavior" text NOT NULL,
	"conditions" text,
	"allowed_supports" text,
	"baseline_summary" text NOT NULL,
	"criterion" text NOT NULL,
	"timeframe" text NOT NULL,
	"functional_context" text,
	"human_approval_status" "goal_human_approval_status" DEFAULT 'pending' NOT NULL,
	"approved_by_team_member_id" uuid,
	"approved_at" timestamp with time zone,
	"goal_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goal_need_link" (
	"goal_need_link_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"need_id" uuid NOT NULL,
	"relationship_type" "goal_need_relationship_type" NOT NULL,
	"primary_link" boolean DEFAULT false NOT NULL,
	"rationale" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement_plan" (
	"measurement_plan_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"measurement_type" text NOT NULL,
	"target_criterion" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "need" (
	"need_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"domain_id" uuid,
	"subdomain_id" uuid,
	"need_type" "need_type" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"functional_impact" text NOT NULL,
	"priority_level" "need_priority_level" NOT NULL,
	"priority_basis" "need_priority_basis" NOT NULL,
	"status" "need_status" DEFAULT 'draft' NOT NULL,
	"identified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"identified_by_team_member_id" uuid NOT NULL,
	"review_due_date" date,
	"source_confidence" "need_source_confidence" DEFAULT 'medium' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_case_id_case_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_learner_id_learner_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_owner_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("owner_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal" ADD CONSTRAINT "goal_approved_by_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("approved_by_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_need_link" ADD CONSTRAINT "goal_need_link_goal_id_goal_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_need_link" ADD CONSTRAINT "goal_need_link_need_id_need_need_id_fk" FOREIGN KEY ("need_id") REFERENCES "public"."need"("need_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_plan" ADD CONSTRAINT "measurement_plan_goal_id_goal_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_case_id_case_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_learner_id_learner_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "need" ADD CONSTRAINT "need_identified_by_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("identified_by_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_case_id_idx" ON "goal" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "goal_learner_id_idx" ON "goal" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "goal_status_idx" ON "goal" USING btree ("status");--> statement-breakpoint
CREATE INDEX "goal_owner_team_member_id_idx" ON "goal" USING btree ("owner_team_member_id");--> statement-breakpoint
CREATE INDEX "goal_need_link_goal_id_idx" ON "goal_need_link" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goal_need_link_need_id_idx" ON "goal_need_link" USING btree ("need_id");--> statement-breakpoint
CREATE INDEX "measurement_plan_goal_id_idx" ON "measurement_plan" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "need_case_id_idx" ON "need" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "need_learner_id_idx" ON "need" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "need_status_idx" ON "need" USING btree ("status");