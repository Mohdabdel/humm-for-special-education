CREATE TYPE "public"."case_confidentiality_level" AS ENUM('standard', 'restricted', 'highly_restricted');--> statement-breakpoint
CREATE TYPE "public"."case_membership_role" AS ENUM('case_manager', 'special_educator', 'therapist', 'supervisor', 'observer');--> statement-breakpoint
CREATE TYPE "public"."case_primary_stage" AS ENUM('assessment', 'planning', 'implementation', 'review', 'transition');--> statement-breakpoint
CREATE TYPE "public"."case_priority_level" AS ENUM('high', 'medium', 'low');--> statement-breakpoint
CREATE TYPE "public"."case_risk_level" AS ENUM('none', 'watch', 'needs_attention', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."case_status" AS ENUM('active', 'review_due', 'closed');--> statement-breakpoint
CREATE TYPE "public"."case_transition_stage" AS ENUM('not_applicable', 'pre_transition', 'exploration', 'planning', 'vocational_training', 'home_based_project', 'active_implementation', 'employment_or_further_education', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."case_type" AS ENUM('IEP', 'transition', 'behavior', 'therapy', 'vocational', 'combined');--> statement-breakpoint
CREATE TABLE "case_membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"team_member_id" uuid NOT NULL,
	"role" "case_membership_role" NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case" (
	"case_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"case_number" text NOT NULL,
	"case_type" "case_type" DEFAULT 'IEP' NOT NULL,
	"program_id" uuid,
	"owner_team_member_id" uuid,
	"status" "case_status" DEFAULT 'active' NOT NULL,
	"primary_stage" "case_primary_stage" DEFAULT 'assessment' NOT NULL,
	"risk_level" "case_risk_level" DEFAULT 'none' NOT NULL,
	"confidentiality_level" "case_confidentiality_level" DEFAULT 'standard' NOT NULL,
	"transition_stage" "case_transition_stage",
	"intake_date" date NOT NULL,
	"start_date" date NOT NULL,
	"target_review_date" date,
	"close_date" date,
	"current_priority_summary" text,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "learner" (
	"learner_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_member" (
	"team_member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "case_membership" ADD CONSTRAINT "case_membership_case_id_case_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_membership" ADD CONSTRAINT "case_membership_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case" ADD CONSTRAINT "case_learner_id_learner_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case" ADD CONSTRAINT "case_owner_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("owner_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "case_membership_case_member_role_key" ON "case_membership" USING btree ("case_id","team_member_id","role");--> statement-breakpoint
CREATE INDEX "case_membership_team_member_id_idx" ON "case_membership" USING btree ("team_member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "case_org_case_number_key" ON "case" USING btree ("organization_id","case_number");--> statement-breakpoint
CREATE INDEX "case_learner_id_idx" ON "case" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "case_status_idx" ON "case" USING btree ("status");--> statement-breakpoint
CREATE INDEX "case_owner_team_member_id_idx" ON "case" USING btree ("owner_team_member_id");--> statement-breakpoint
CREATE INDEX "case_program_id_idx" ON "case" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "learner_organization_id_idx" ON "learner" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "team_member_organization_id_idx" ON "team_member" USING btree ("organization_id");