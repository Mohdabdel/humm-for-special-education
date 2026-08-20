BEGIN;

REVOKE ALL ON TABLE public.measurement_plan FROM anon, authenticated;
REVOKE ALL ON TABLE public.measurement_definition FROM anon, authenticated;

GRANT SELECT ON TABLE public.measurement_plan TO authenticated;
GRANT SELECT ON TABLE public.measurement_definition TO authenticated;

ALTER TABLE public.measurement_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurement_definition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS measurement_plan_insert_case_members ON public.measurement_plan;
DROP POLICY IF EXISTS measurement_plan_select_case_members ON public.measurement_plan;
DROP POLICY IF EXISTS measurement_plan_update_case_members ON public.measurement_plan;

DROP POLICY IF EXISTS measurement_definition_insert_case_members ON public.measurement_definition;
DROP POLICY IF EXISTS measurement_definition_select_case_members ON public.measurement_definition;
DROP POLICY IF EXISTS measurement_definition_update_case_members ON public.measurement_definition;

CREATE POLICY measurement_plan_select_case_members
ON public.measurement_plan
FOR SELECT
TO authenticated
USING (public.has_goal_case_access(goal_id));

CREATE POLICY measurement_definition_select_case_members
ON public.measurement_definition
FOR SELECT
TO authenticated
USING (public.has_goal_case_access(goal_id));

CREATE OR REPLACE FUNCTION public.create_measurement_plan_hardened(
  _goal_id uuid,
  _measurement_type text,
  _target_criterion text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_goal public.goal%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_measurement_plan_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_goal
  FROM public.goal
  WHERE goal_id = _goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_goal.case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF v_goal.human_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Measurement plan requires an approved goal';
  END IF;

  IF nullif(btrim(_measurement_type), '') IS NULL THEN
    RAISE EXCEPTION 'measurement_type is required';
  END IF;

  IF nullif(btrim(_target_criterion), '') IS NULL THEN
    RAISE EXCEPTION 'target_criterion is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.measurement_plan mp
    WHERE mp.goal_id = _goal_id
  ) THEN
    RAISE EXCEPTION 'A measurement plan already exists for this goal';
  END IF;

  INSERT INTO public.measurement_plan (
    goal_id,
    measurement_type,
    target_criterion
  )
  VALUES (
    _goal_id,
    btrim(_measurement_type),
    btrim(_target_criterion)
  )
  RETURNING measurement_plan_id INTO v_measurement_plan_id;

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
    v_goal.case_id,
    v_actor,
    v_role,
    'MEASUREMENT_PLAN_CREATE',
    'MEASUREMENT_PLAN',
    v_measurement_plan_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('rule', 'goal_approved', 'passed', true),
      jsonb_build_object('rule', 'one_measurement_plan_per_goal', 'passed', true)
    ),
    jsonb_build_object(
      'source', 'create_measurement_plan_hardened',
      'goal_id', _goal_id,
      'measurement_type', btrim(_measurement_type)
    )
  );

  RETURN v_measurement_plan_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_measurement_definition_hardened(
  _measurement_plan_id uuid,
  _goal_id uuid,
  _code text,
  _label_ar text,
  _measurement_type public.measurement_definition_type,
  _unit text,
  _target_criterion text,
  _collection_cadence text,
  _support_tracking_required boolean DEFAULT false,
  _numerator_label text DEFAULT NULL,
  _denominator_label text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_goal public.goal%ROWTYPE;
  v_plan public.measurement_plan%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_measurement_definition_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_plan
  FROM public.measurement_plan
  WHERE measurement_plan_id = _measurement_plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Measurement plan not found';
  END IF;

  IF v_plan.goal_id <> _goal_id THEN
    RAISE EXCEPTION 'Measurement plan goal does not match requested goal';
  END IF;

  SELECT * INTO v_goal
  FROM public.goal
  WHERE goal_id = _goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_goal.case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF v_goal.human_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Measurement definition requires an approved goal';
  END IF;

  IF nullif(btrim(_code), '') IS NULL THEN
    RAISE EXCEPTION 'code is required';
  END IF;

  IF nullif(btrim(_label_ar), '') IS NULL THEN
    RAISE EXCEPTION 'label_ar is required';
  END IF;

  IF nullif(btrim(_unit), '') IS NULL THEN
    RAISE EXCEPTION 'unit is required';
  END IF;

  IF nullif(btrim(_target_criterion), '') IS NULL THEN
    RAISE EXCEPTION 'target_criterion is required';
  END IF;

  IF nullif(btrim(_collection_cadence), '') IS NULL THEN
    RAISE EXCEPTION 'collection_cadence is required';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.measurement_definition md
    WHERE md.measurement_plan_id = _measurement_plan_id
      AND md.code = btrim(_code)
  ) THEN
    RAISE EXCEPTION 'Measurement definition code already exists for this plan';
  END IF;

  INSERT INTO public.measurement_definition (
    measurement_plan_id,
    goal_id,
    code,
    label_ar,
    measurement_type,
    unit,
    numerator_label,
    denominator_label,
    target_criterion,
    collection_cadence,
    support_tracking_required,
    status
  )
  VALUES (
    _measurement_plan_id,
    _goal_id,
    btrim(_code),
    btrim(_label_ar),
    _measurement_type,
    btrim(_unit),
    nullif(btrim(_numerator_label), ''),
    nullif(btrim(_denominator_label), ''),
    btrim(_target_criterion),
    btrim(_collection_cadence),
    COALESCE(_support_tracking_required, false),
    'draft'
  )
  RETURNING measurement_definition_id INTO v_measurement_definition_id;

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
    v_goal.case_id,
    v_actor,
    v_role,
    'MEASUREMENT_DEFINITION_CREATE',
    'MEASUREMENT_DEFINITION',
    v_measurement_definition_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('rule', 'goal_approved', 'passed', true),
      jsonb_build_object('rule', 'measurement_plan_matches_goal', 'passed', true),
      jsonb_build_object('status', 'draft')
    ),
    jsonb_build_object(
      'source', 'create_measurement_definition_hardened',
      'goal_id', _goal_id,
      'measurement_plan_id', _measurement_plan_id,
      'measurement_type', _measurement_type,
      'code', btrim(_code)
    )
  );

  RETURN v_measurement_definition_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_measurement_definition_hardened(
  _measurement_definition_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_definition public.measurement_definition%ROWTYPE;
  v_goal public.goal%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_definition
  FROM public.measurement_definition
  WHERE measurement_definition_id = _measurement_definition_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Measurement definition not found';
  END IF;

  SELECT * INTO v_goal
  FROM public.goal
  WHERE goal_id = v_definition.goal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Goal not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_goal.case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF v_goal.human_approval_status <> 'approved' THEN
    RAISE EXCEPTION 'Activation requires an approved goal';
  END IF;

  IF v_definition.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft measurement definitions can be activated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.measurement_plan mp
    WHERE mp.measurement_plan_id = v_definition.measurement_plan_id
      AND mp.goal_id = v_definition.goal_id
  ) THEN
    RAISE EXCEPTION 'Measurement definition is not linked to a valid goal measurement plan';
  END IF;

  UPDATE public.measurement_definition
  SET status = 'active',
      updated_at = now()
  WHERE measurement_definition_id = _measurement_definition_id;

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
    v_goal.case_id,
    v_actor,
    v_role,
    'MEASUREMENT_DEFINITION_ACTIVATE',
    'MEASUREMENT_DEFINITION',
    _measurement_definition_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('from', v_definition.status, 'to', 'active'),
      jsonb_build_object('rule', 'goal_approved', 'passed', true),
      jsonb_build_object('rule', 'measurement_plan_matches_goal', 'passed', true)
    ),
    jsonb_build_object(
      'source', 'activate_measurement_definition_hardened',
      'goal_id', v_definition.goal_id,
      'measurement_plan_id', v_definition.measurement_plan_id
    )
  );

  RETURN _measurement_definition_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_measurement_plan_hardened(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_measurement_definition_hardened(uuid, uuid, text, text, public.measurement_definition_type, text, text, text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.activate_measurement_definition_hardened(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_measurement_plan_hardened(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_measurement_definition_hardened(uuid, uuid, text, text, public.measurement_definition_type, text, text, text, boolean, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.activate_measurement_definition_hardened(uuid) TO authenticated;

COMMIT;
