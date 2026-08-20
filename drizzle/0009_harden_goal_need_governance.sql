-- Hardening migration for goal, need, and governance audit foundations.
-- Applied to Supabase after user approval.

BEGIN;

CREATE TABLE IF NOT EXISTS public.governance_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  case_id uuid REFERENCES public."case"(case_id),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id),
  actor_org_role text,
  action_code text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  record_version integer NOT NULL CHECK (record_version >= 1),
  outcome text NOT NULL CHECK (
    outcome IN (
      'APPROVED',
      'APPROVED_WITH_DISCLOSURE',
      'BLOCKED',
      'SAFE_STOP',
      'REVOKED',
      'CONFIG_CHANGED'
    )
  ),
  rule_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quality_disclosures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  case_id uuid NOT NULL REFERENCES public."case"(case_id),
  entity_type text NOT NULL CHECK (
    entity_type IN ('EVIDENCE_RECORD', 'GOAL', 'ASSESSMENT', 'TRANSITION_PORTFOLIO', 'CASE')
  ),
  entity_id uuid NOT NULL,
  entity_version integer NOT NULL CHECK (entity_version >= 1),
  rule_code text NOT NULL,
  gap_type text NOT NULL,
  impact text NOT NULL,
  follow_up_owner uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'waived')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolution_note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.prevent_governance_audit_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'governance_audit_log is append-only: UPDATE/DELETE are forbidden'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS governance_audit_log_append_only_update ON public.governance_audit_log;
CREATE TRIGGER governance_audit_log_append_only_update
BEFORE UPDATE ON public.governance_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_governance_audit_log_mutation();

DROP TRIGGER IF EXISTS governance_audit_log_append_only_delete ON public.governance_audit_log;
CREATE TRIGGER governance_audit_log_append_only_delete
BEFORE DELETE ON public.governance_audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prevent_governance_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.can_access_case(_case_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_membership cm
    JOIN public.team_member tm
      ON tm.team_member_id = cm.team_member_id
    WHERE cm.case_id = _case_id
      AND cm.ended_at IS NULL
      AND tm.user_id = auth.uid()
  )
$$;

REVOKE ALL ON public.goal FROM anon;
REVOKE ALL ON public.goal FROM authenticated;
REVOKE ALL ON public.need FROM anon;
REVOKE ALL ON public.need FROM authenticated;

GRANT SELECT ON public.goal TO authenticated;
GRANT SELECT ON public.need TO authenticated;

ALTER TABLE public.goal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.need ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goal_select_case_members ON public.goal;
DROP POLICY IF EXISTS goal_insert_case_members ON public.goal;
DROP POLICY IF EXISTS goal_update_case_members ON public.goal;

CREATE POLICY goal_select_case_members
ON public.goal
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

DROP POLICY IF EXISTS need_select_case_members ON public.need;
DROP POLICY IF EXISTS need_insert_case_members ON public.need;
DROP POLICY IF EXISTS need_update_case_members ON public.need;

CREATE POLICY need_select_case_members
ON public.need
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

REVOKE ALL ON public.governance_audit_log FROM anon;
REVOKE ALL ON public.governance_audit_log FROM authenticated;
REVOKE ALL ON public.quality_disclosures FROM anon;
REVOKE ALL ON public.quality_disclosures FROM authenticated;

GRANT SELECT ON public.governance_audit_log TO authenticated;
GRANT SELECT ON public.quality_disclosures TO authenticated;

ALTER TABLE public.governance_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_disclosures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS governance_audit_log_select_case_members ON public.governance_audit_log;
CREATE POLICY governance_audit_log_select_case_members
ON public.governance_audit_log
FOR SELECT
TO authenticated
USING (
  actor_user_id = auth.uid()
  OR (case_id IS NOT NULL AND public.can_access_case(case_id))
);

DROP POLICY IF EXISTS quality_disclosures_select_case_members ON public.quality_disclosures;
CREATE POLICY quality_disclosures_select_case_members
ON public.quality_disclosures
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE OR REPLACE FUNCTION public.finalize_goal_for_review_hardened(_goal_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal public.goal%ROWTYPE;
  v_actor_team_member_id uuid;
  v_org_id uuid;
BEGIN
  SELECT * INTO v_goal
  FROM public.goal
  WHERE goal_id = _goal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.can_access_case(v_goal.case_id) THEN
    RAISE EXCEPTION 'no case access' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT tm.team_member_id INTO v_actor_team_member_id
  FROM public.team_member tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;

  IF v_actor_team_member_id IS NULL THEN
    RAISE EXCEPTION 'actor is not linked to a team_member'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_goal.owner_team_member_id <> v_actor_team_member_id THEN
    RAISE EXCEPTION 'only goal owner can finalize for review'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.case_membership cm
    WHERE cm.case_id = v_goal.case_id
      AND cm.team_member_id = v_actor_team_member_id
      AND cm.ended_at IS NULL
      AND cm.role IN ('special_educator', 'therapist')
  ) THEN
    RAISE EXCEPTION 'finalize requires special_educator or therapist role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_goal.status <> 'draft' THEN
    RAISE EXCEPTION 'only draft goals can be finalized for review'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.goal
  SET status = 'in_review',
      updated_at = now()
  WHERE goal_id = _goal_id;

  SELECT c.organization_id INTO v_org_id
  FROM public."case" c
  WHERE c.case_id = v_goal.case_id;

  INSERT INTO public.governance_audit_log (
    organization_id,
    case_id,
    actor_user_id,
    actor_org_role,
    action_code,
    entity_type,
    entity_id,
    record_version,
    outcome,
    rule_results,
    provenance
  )
  VALUES (
    v_org_id,
    v_goal.case_id,
    auth.uid(),
    'special_educator_or_therapist',
    'GOAL_FINALIZE_FOR_REVIEW',
    'GOAL',
    _goal_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(jsonb_build_object('rule', 'author_role_gate', 'passed', true)),
    jsonb_build_object('source', 'finalize_goal_for_review_hardened')
  );

  RETURN _goal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_goal_hardened(
  _goal_id uuid,
  _decision text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_goal public.goal%ROWTYPE;
  v_actor_team_member_id uuid;
  v_org_id uuid;
  v_new_status public.goal_status;
  v_new_approval public.goal_human_approval_status;
  v_outcome text;
BEGIN
  IF _decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'decision must be approved or rejected'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO v_goal
  FROM public.goal
  WHERE goal_id = _goal_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'goal not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF NOT public.can_access_case(v_goal.case_id) THEN
    RAISE EXCEPTION 'no case access' USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF v_goal.status <> 'in_review' THEN
    RAISE EXCEPTION 'goal approval requires status = in_review'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT tm.team_member_id INTO v_actor_team_member_id
  FROM public.team_member tm
  WHERE tm.user_id = auth.uid()
  LIMIT 1;

  IF v_actor_team_member_id IS NULL THEN
    RAISE EXCEPTION 'actor is not linked to a team_member'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.case_membership cm
    WHERE cm.case_id = v_goal.case_id
      AND cm.team_member_id = v_actor_team_member_id
      AND cm.ended_at IS NULL
      AND cm.role IN ('supervisor', 'case_manager')
  ) THEN
    RAISE EXCEPTION 'approval requires supervisor or case_manager role'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF _decision = 'approved' THEN
    v_new_status := 'approved';
    v_new_approval := 'approved';
    v_outcome := 'APPROVED';
  ELSE
    v_new_status := 'draft';
    v_new_approval := 'rejected';
    v_outcome := 'BLOCKED';
  END IF;

  UPDATE public.goal
  SET human_approval_status = v_new_approval,
      status = v_new_status,
      approved_by_team_member_id = v_actor_team_member_id,
      approved_at = now(),
      updated_at = now()
  WHERE goal_id = _goal_id;

  SELECT c.organization_id INTO v_org_id
  FROM public."case" c
  WHERE c.case_id = v_goal.case_id;

  INSERT INTO public.governance_audit_log (
    organization_id,
    case_id,
    actor_user_id,
    actor_org_role,
    action_code,
    entity_type,
    entity_id,
    record_version,
    outcome,
    rule_results,
    provenance
  )
  VALUES (
    v_org_id,
    v_goal.case_id,
    auth.uid(),
    'supervisor_or_case_manager',
    CASE WHEN _decision = 'approved' THEN 'GOAL_APPROVE' ELSE 'GOAL_REJECT' END,
    'GOAL',
    _goal_id,
    1,
    v_outcome,
    jsonb_build_array(jsonb_build_object('rule', 'reviewer_role_gate', 'passed', true)),
    jsonb_build_object('source', 'approve_goal_hardened')
  );

  RETURN _goal_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_goal_for_review_hardened(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_goal_hardened(uuid, text) TO authenticated;

DROP TRIGGER IF EXISTS goal_approval_gates ON public.goal;

COMMIT;
