BEGIN;

REVOKE ALL ON TABLE public."case" FROM anon, authenticated;
REVOKE ALL ON TABLE public.learner FROM anon, authenticated;
REVOKE ALL ON TABLE public.team_member FROM anon, authenticated;
REVOKE ALL ON TABLE public.case_membership FROM anon, authenticated;

GRANT SELECT ON TABLE public."case" TO authenticated;
GRANT SELECT ON TABLE public.learner TO authenticated;
GRANT SELECT ON TABLE public.team_member TO authenticated;
GRANT SELECT ON TABLE public.case_membership TO authenticated;

ALTER TABLE public."case" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_membership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS case_select_for_members ON public."case";
DROP POLICY IF EXISTS case_update_for_members ON public."case";
DROP POLICY IF EXISTS learner_select_case_members ON public.learner;
DROP POLICY IF EXISTS team_member_select_shared_cases ON public.team_member;
DROP POLICY IF EXISTS case_membership_select_own ON public.case_membership;

CREATE OR REPLACE FUNCTION public.can_access_learner(_learner_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public."case" c
    WHERE c.learner_id = _learner_id
      AND public.can_access_case(c.case_id)
  );
$$;

CREATE OR REPLACE FUNCTION public.can_manage_case(_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.current_team_member_for_case(_case_id) tm
    WHERE tm.role_on_case IN ('case_manager', 'supervisor')
  );
$$;

REVOKE ALL ON FUNCTION public.can_access_learner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_case(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_access_learner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_case(uuid) TO authenticated;

CREATE POLICY case_select_case_members
ON public."case"
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE POLICY learner_select_case_members
ON public.learner
FOR SELECT
TO authenticated
USING (public.can_access_learner(learner_id));

CREATE POLICY team_member_select_shared_cases
ON public.team_member
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR public.shares_active_case_with_current_user(team_member_id));

CREATE POLICY case_membership_select_case_members
ON public.case_membership
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE OR REPLACE FUNCTION public.update_case_status_hardened(
  _case_id uuid,
  _status public.case_status,
  _risk_level public.case_risk_level DEFAULT NULL,
  _primary_stage public.case_primary_stage DEFAULT NULL,
  _current_priority_summary text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_case public."case"%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_case
  FROM public."case"
  WHERE case_id = _case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(_case_id) tm;

  IF v_team_member_id IS NULL OR v_role NOT IN ('case_manager', 'supervisor') THEN
    RAISE EXCEPTION 'Only case_manager or supervisor may update case status' USING ERRCODE = '42501';
  END IF;

  UPDATE public."case"
  SET status = _status,
      risk_level = COALESCE(_risk_level, risk_level),
      primary_stage = COALESCE(_primary_stage, primary_stage),
      current_priority_summary = COALESCE(_current_priority_summary, current_priority_summary),
      last_activity_at = now(),
      updated_at = now(),
      updated_by = v_actor
  WHERE case_id = _case_id;

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
    v_org,
    _case_id,
    v_actor,
    v_role,
    'CASE_STATUS_UPDATE',
    'CASE',
    _case_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('rule', 'case_manager_or_supervisor', 'passed', true),
      jsonb_build_object('from_status', v_case.status, 'to_status', _status)
    ),
    jsonb_build_object(
      'source', 'update_case_status_hardened',
      'risk_level_changed', (_risk_level IS NOT NULL AND _risk_level IS DISTINCT FROM v_case.risk_level),
      'primary_stage_changed', (_primary_stage IS NOT NULL AND _primary_stage IS DISTINCT FROM v_case.primary_stage),
      'priority_summary_changed', (_current_priority_summary IS NOT NULL AND _current_priority_summary IS DISTINCT FROM v_case.current_priority_summary)
    )
  );

  RETURN _case_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_case_membership_hardened(
  _case_id uuid,
  _team_member_id uuid,
  _role public.case_membership_role
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_case public."case"%ROWTYPE;
  v_target_member public.team_member%ROWTYPE;
  v_actor_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_membership_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_case
  FROM public."case"
  WHERE case_id = _case_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_actor_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(_case_id) tm;

  IF v_actor_team_member_id IS NULL OR v_role NOT IN ('case_manager', 'supervisor') THEN
    RAISE EXCEPTION 'Only case_manager or supervisor may add case memberships' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_target_member
  FROM public.team_member
  WHERE team_member_id = _team_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target team member not found';
  END IF;

  IF v_target_member.organization_id <> v_case.organization_id THEN
    RAISE EXCEPTION 'Target team member organization does not match case organization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.case_membership cm
    WHERE cm.case_id = _case_id
      AND cm.team_member_id = _team_member_id
      AND cm.ended_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Active case membership already exists';
  END IF;

  INSERT INTO public.case_membership (case_id, team_member_id, role)
  VALUES (_case_id, _team_member_id, _role)
  RETURNING id INTO v_membership_id;

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
    v_org,
    _case_id,
    v_actor,
    v_role,
    'CASE_MEMBERSHIP_ADD',
    'CASE_MEMBERSHIP',
    v_membership_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('rule', 'case_manager_or_supervisor', 'passed', true),
      jsonb_build_object('rule', 'same_organization', 'passed', true),
      jsonb_build_object('rule', 'no_active_duplicate', 'passed', true)
    ),
    jsonb_build_object(
      'source', 'add_case_membership_hardened',
      'target_team_member_id', _team_member_id,
      'role', _role
    )
  );

  RETURN v_membership_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.end_case_membership_hardened(
  _membership_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_membership public.case_membership%ROWTYPE;
  v_actor_team_member_id uuid;
  v_role text;
  v_org uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_membership
  FROM public.case_membership
  WHERE id = _membership_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Case membership not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_actor_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_membership.case_id) tm;

  IF v_actor_team_member_id IS NULL OR v_role NOT IN ('case_manager', 'supervisor') THEN
    RAISE EXCEPTION 'Only case_manager or supervisor may end case memberships' USING ERRCODE = '42501';
  END IF;

  IF v_membership.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'Case membership is already ended';
  END IF;

  UPDATE public.case_membership
  SET ended_at = now()
  WHERE id = _membership_id;

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
    v_org,
    v_membership.case_id,
    v_actor,
    v_role,
    'CASE_MEMBERSHIP_END',
    'CASE_MEMBERSHIP',
    _membership_id,
    1,
    'REVOKED',
    jsonb_build_array(
      jsonb_build_object('rule', 'case_manager_or_supervisor', 'passed', true),
      jsonb_build_object('previous_role', v_membership.role)
    ),
    jsonb_build_object(
      'source', 'end_case_membership_hardened',
      'target_team_member_id', v_membership.team_member_id
    )
  );

  RETURN _membership_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_case_status_hardened(uuid, public.case_status, public.case_risk_level, public.case_primary_stage, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_case_membership_hardened(uuid, uuid, public.case_membership_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_case_membership_hardened(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.update_case_status_hardened(uuid, public.case_status, public.case_risk_level, public.case_primary_stage, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_case_membership_hardened(uuid, uuid, public.case_membership_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_case_membership_hardened(uuid) TO authenticated;

COMMIT;
