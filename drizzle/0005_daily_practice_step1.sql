CREATE TYPE "public"."observation_purpose" AS ENUM('baseline', 'progress', 'incident', 'generalization', 'quality_check', 'follow_up');--> statement-breakpoint
CREATE TYPE "public"."observation_status" AS ENUM('draft', 'reviewed', 'approved', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."observation_type" AS ENUM('structured', 'narrative', 'ABC', 'functional', 'classroom', 'family_report', 'learner_report', 'task_performance');--> statement-breakpoint
CREATE TYPE "public"."session_completion_status" AS ENUM('complete', 'partial', 'not_completed');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('scheduled', 'in_progress', 'completed', 'missed', 'cancelled', 'documented');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('special_education', 'therapy', 'behavior_support', 'vocational_training', 'functional_activity', 'classroom_support', 'community_based', 'family_coaching', 'meeting');--> statement-breakpoint
CREATE TABLE "observation" (
	"observation_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"session_id" uuid,
	"goal_id" uuid,
	"observer_team_member_id" uuid NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"observation_type" "observation_type" NOT NULL,
	"purpose" "observation_purpose" NOT NULL,
	"narrative_text" text,
	"status" "observation_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"session_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"learner_id" uuid NOT NULL,
	"session_type" "session_type" NOT NULL,
	"scheduled_start_at" timestamp with time zone,
	"scheduled_end_at" timestamp with time zone,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"delivered_by_team_member_id" uuid NOT NULL,
	"plan_id" uuid,
	"goal_id" uuid,
	"status" "session_status" DEFAULT 'scheduled' NOT NULL,
	"completion_status" "session_completion_status",
	"brief_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_case_id_case_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_learner_id_learner_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_session_id_session_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("session_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_goal_id_goal_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observation" ADD CONSTRAINT "observation_observer_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("observer_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_case_id_case_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_learner_id_learner_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_delivered_by_team_member_id_team_member_team_member_id_fk" FOREIGN KEY ("delivered_by_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_goal_id_goal_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "observation_case_id_idx" ON "observation" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "observation_learner_id_idx" ON "observation" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "observation_session_id_idx" ON "observation" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "observation_goal_id_idx" ON "observation" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "observation_status_idx" ON "observation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "observation_observer_team_member_id_idx" ON "observation" USING btree ("observer_team_member_id");--> statement-breakpoint
CREATE INDEX "session_case_id_idx" ON "session" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "session_learner_id_idx" ON "session" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "session_status_idx" ON "session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "session_goal_id_idx" ON "session" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "session_delivered_by_team_member_id_idx" ON "session" USING btree ("delivered_by_team_member_id");--> statement-breakpoint
-- ============================================================
-- RLS for Daily Practice Workspace (session, observation)
-- Access rule: the authenticated user must hold an active
-- case_membership on the owning case, linked via team_member.user_id.
-- Reuses public.has_case_access(case_id) defined in migration 0002.
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.session TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.observation TO authenticated;
GRANT ALL ON public.session TO service_role;
GRANT ALL ON public.observation TO service_role;

ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_select_case_members" ON public.session
  FOR SELECT TO authenticated USING (public.has_case_access(case_id));
CREATE POLICY "session_insert_case_members" ON public.session
  FOR INSERT TO authenticated WITH CHECK (public.has_case_access(case_id));
CREATE POLICY "session_update_case_members" ON public.session
  FOR UPDATE TO authenticated USING (public.has_case_access(case_id))
  WITH CHECK (public.has_case_access(case_id));

CREATE POLICY "observation_select_case_members" ON public.observation
  FOR SELECT TO authenticated USING (public.has_case_access(case_id));
CREATE POLICY "observation_insert_case_members" ON public.observation
  FOR INSERT TO authenticated WITH CHECK (public.has_case_access(case_id));
CREATE POLICY "observation_update_case_members" ON public.observation
  FOR UPDATE TO authenticated USING (public.has_case_access(case_id))
  WITH CHECK (public.has_case_access(case_id));
