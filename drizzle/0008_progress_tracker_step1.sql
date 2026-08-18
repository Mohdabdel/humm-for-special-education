-- Progress & Evidence Tracker - STEP 1
-- Tables: measurement_definition (simplified per D-34), data_point.
-- NOT applied to the database by this step.

CREATE TYPE "public"."measurement_definition_type" AS ENUM(
  'accuracy',
  'frequency',
  'duration',
  'latency',
  'task_analysis',
  'prompt_level',
  'productivity',
  'quality',
  'self_correction',
  'generalization'
);--> statement-breakpoint

CREATE TYPE "public"."measurement_definition_status" AS ENUM('draft', 'active');--> statement-breakpoint

CREATE TYPE "public"."data_point_unit" AS ENUM(
  'percent',
  'count',
  'duration_seconds',
  'duration_minutes',
  'latency_seconds',
  'rate',
  'rubric_score',
  'prompt_level',
  'productivity_rate'
);--> statement-breakpoint

CREATE TYPE "public"."data_point_outcome_code" AS ENUM(
  'success',
  'partial',
  'unsuccessful',
  'not_applicable'
);--> statement-breakpoint

CREATE TYPE "public"."data_point_source_mode" AS ENUM(
  'manual',
  'imported',
  'device_assisted',
  'AI_suggested'
);--> statement-breakpoint

CREATE TYPE "public"."data_point_validation_status" AS ENUM(
  'draft',
  'validated',
  'corrected',
  'rejected'
);--> statement-breakpoint

CREATE TABLE "measurement_definition" (
  "measurement_definition_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "measurement_plan_id" uuid NOT NULL,
  "goal_id" uuid NOT NULL,
  "code" text NOT NULL,
  "label_ar" text NOT NULL,
  "measurement_type" "measurement_definition_type" NOT NULL,
  "unit" text NOT NULL,
  "numerator_label" text,
  "denominator_label" text,
  "target_criterion" text NOT NULL,
  "collection_cadence" text NOT NULL,
  "support_tracking_required" boolean DEFAULT false NOT NULL,
  "status" "measurement_definition_status" DEFAULT 'draft' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "data_point" (
  "data_point_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "observation_id" uuid NOT NULL,
  "case_id" uuid NOT NULL,
  "learner_id" uuid NOT NULL,
  "goal_id" uuid NOT NULL,
  "measurement_definition_id" uuid NOT NULL,
  "value_numeric" numeric,
  "numerator" numeric,
  "denominator" numeric,
  "unit" "data_point_unit" NOT NULL,
  "outcome_code" "data_point_outcome_code" NOT NULL,
  "recorded_at" timestamp with time zone NOT NULL,
  "source_mode" "data_point_source_mode" DEFAULT 'manual' NOT NULL,
  "validation_status" "data_point_validation_status" DEFAULT 'draft' NOT NULL,
  "recorded_by_team_member_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint

ALTER TABLE "measurement_definition" ADD CONSTRAINT "measurement_definition_measurement_plan_id_fk" FOREIGN KEY ("measurement_plan_id") REFERENCES "public"."measurement_plan"("measurement_plan_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement_definition" ADD CONSTRAINT "measurement_definition_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_observation_id_fk" FOREIGN KEY ("observation_id") REFERENCES "public"."observation"("observation_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_case_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."case"("case_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_learner_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."learner"("learner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_goal_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goal"("goal_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_measurement_definition_id_fk" FOREIGN KEY ("measurement_definition_id") REFERENCES "public"."measurement_definition"("measurement_definition_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_point" ADD CONSTRAINT "data_point_recorded_by_team_member_id_fk" FOREIGN KEY ("recorded_by_team_member_id") REFERENCES "public"."team_member"("team_member_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE INDEX "measurement_definition_plan_id_idx" ON "measurement_definition" USING btree ("measurement_plan_id");--> statement-breakpoint
CREATE INDEX "measurement_definition_goal_id_idx" ON "measurement_definition" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "measurement_definition_status_idx" ON "measurement_definition" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_point_observation_id_idx" ON "data_point" USING btree ("observation_id");--> statement-breakpoint
CREATE INDEX "data_point_case_id_idx" ON "data_point" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "data_point_goal_id_idx" ON "data_point" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "data_point_measurement_definition_id_idx" ON "data_point" USING btree ("measurement_definition_id");--> statement-breakpoint
CREATE INDEX "data_point_recorded_at_idx" ON "data_point" USING btree ("recorded_at");--> statement-breakpoint

-- D-33 lesson: measurement_definition has no direct case_id, so case access
-- is derived through a SECURITY DEFINER helper instead of a direct RLS-policy
-- subquery against the RLS-protected goal table.
CREATE OR REPLACE FUNCTION public.has_goal_case_access(_goal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.goal g
    WHERE g.goal_id = _goal_id
      AND public.has_case_access(g.case_id)
  )
$function$;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON public.measurement_definition TO authenticated;--> statement-breakpoint
GRANT ALL ON public.measurement_definition TO service_role;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON public.data_point TO authenticated;--> statement-breakpoint
GRANT ALL ON public.data_point TO service_role;--> statement-breakpoint

ALTER TABLE public.measurement_definition ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.data_point ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY measurement_definition_select_case_members
ON public.measurement_definition FOR SELECT TO authenticated
USING (public.has_goal_case_access(goal_id));--> statement-breakpoint
CREATE POLICY measurement_definition_insert_case_members
ON public.measurement_definition FOR INSERT TO authenticated
WITH CHECK (public.has_goal_case_access(goal_id));--> statement-breakpoint
CREATE POLICY measurement_definition_update_case_members
ON public.measurement_definition FOR UPDATE TO authenticated
USING (public.has_goal_case_access(goal_id))
WITH CHECK (public.has_goal_case_access(goal_id));--> statement-breakpoint

CREATE POLICY data_point_select_case_members
ON public.data_point FOR SELECT TO authenticated
USING (public.has_case_access(case_id));--> statement-breakpoint
CREATE POLICY data_point_insert_case_members
ON public.data_point FOR INSERT TO authenticated
WITH CHECK (public.has_case_access(case_id));--> statement-breakpoint
CREATE POLICY data_point_update_case_members
ON public.data_point FOR UPDATE TO authenticated
USING (public.has_case_access(case_id))
WITH CHECK (public.has_case_access(case_id));
