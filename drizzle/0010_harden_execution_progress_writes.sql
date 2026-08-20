BEGIN;

REVOKE ALL ON TABLE public.data_point FROM anon, authenticated;
REVOKE ALL ON TABLE public.observation FROM anon, authenticated;
REVOKE ALL ON TABLE public."session" FROM anon, authenticated;

GRANT SELECT ON TABLE public.data_point TO authenticated;
GRANT SELECT ON TABLE public.observation TO authenticated;
GRANT SELECT ON TABLE public."session" TO authenticated;

ALTER TABLE public.data_point ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."session" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_point_insert_case_members ON public.data_point;
DROP POLICY IF EXISTS data_point_select_case_members ON public.data_point;
DROP POLICY IF EXISTS data_point_update_case_members ON public.data_point;

DROP POLICY IF EXISTS observation_insert_case_members ON public.observation;
DROP POLICY IF EXISTS observation_select_case_members ON public.observation;
DROP POLICY IF EXISTS observation_update_case_members ON public.observation;

DROP POLICY IF EXISTS session_insert_case_members ON public."session";
DROP POLICY IF EXISTS session_select_case_members ON public."session";
DROP POLICY IF EXISTS session_update_case_members ON public."session";

CREATE POLICY data_point_select_case_members
ON public.data_point
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE POLICY observation_select_case_members
ON public.observation
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE POLICY session_select_case_members
ON public."session"
FOR SELECT
TO authenticated
USING (public.can_access_case(case_id));

CREATE OR REPLACE FUNCTION public.current_team_member_for_case(_case_id uuid)
RETURNS TABLE(team_member_id uuid, role_on_case text, organization_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT tm.team_member_id, cm.role, c.organization_id
  FROM public.case_membership cm
  JOIN public.team_member tm ON tm.team_member_id = cm.team_member_id
  JOIN public."case" c ON c.case_id = cm.case_id
  WHERE cm.case_id = _case_id
    AND cm.ended_at IS NULL
    AND tm.user_id = auth.uid()
  ORDER BY
    CASE cm.role
      WHEN 'case_manager' THEN 1
      WHEN 'supervisor' THEN 2
      WHEN 'special_educator' THEN 3
      WHEN 'therapist' THEN 4
      ELSE 9
    END
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_team_member_for_case(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_team_member_for_case(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_session_hardened(
  _case_id uuid,
  _learner_id uuid,
  _session_type public.session_type,
  _scheduled_start_at timestamptz DEFAULT NULL,
  _scheduled_end_at timestamptz DEFAULT NULL,
  _goal_id uuid DEFAULT NULL,
  _brief_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_case_learner uuid;
  v_session_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT c.learner_id INTO v_case_learner
  FROM public."case" c
  WHERE c.case_id = _case_id;

  IF v_case_learner IS NULL OR v_case_learner <> _learner_id THEN
    RAISE EXCEPTION 'Session learner does not match case learner';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(_case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF _scheduled_start_at IS NOT NULL
     AND _scheduled_end_at IS NOT NULL
     AND _scheduled_end_at <= _scheduled_start_at THEN
    RAISE EXCEPTION 'scheduled_end_at must be after scheduled_start_at';
  END IF;

  IF _goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.goal g
    WHERE g.goal_id = _goal_id
      AND g.case_id = _case_id
      AND g.learner_id = _learner_id
  ) THEN
    RAISE EXCEPTION 'Goal does not belong to the same case and learner';
  END IF;

  INSERT INTO public."session" (
    case_id,
    learner_id,
    session_type,
    scheduled_start_at,
    scheduled_end_at,
    delivered_by_team_member_id,
    goal_id,
    status,
    brief_note
  )
  VALUES (
    _case_id,
    _learner_id,
    _session_type,
    _scheduled_start_at,
    _scheduled_end_at,
    v_team_member_id,
    _goal_id,
    'scheduled',
    _brief_note
  )
  RETURNING session_id INTO v_session_id;

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
    'SESSION_CREATE',
    'SESSION',
    v_session_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(jsonb_build_object('rule', 'can_access_case', 'passed', true)),
    jsonb_build_object('source', 'create_session_hardened')
  );

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_session_status_hardened(
  _session_id uuid,
  _next_status public.session_status,
  _completion_status public.session_completion_status DEFAULT NULL,
  _brief_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_session public."session"%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session
  FROM public."session"
  WHERE session_id = _session_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_session.case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    (v_session.status = 'scheduled' AND _next_status = 'in_progress') OR
    (v_session.status = 'in_progress' AND _next_status = 'completed')
  ) THEN
    RAISE EXCEPTION 'Invalid session status transition';
  END IF;

  UPDATE public."session"
  SET
    status = _next_status,
    actual_start_at = CASE
      WHEN _next_status = 'in_progress' AND actual_start_at IS NULL THEN now()
      ELSE actual_start_at
    END,
    actual_end_at = CASE
      WHEN _next_status = 'completed' AND actual_end_at IS NULL THEN now()
      ELSE actual_end_at
    END,
    completion_status = CASE
      WHEN _next_status = 'completed' THEN COALESCE(_completion_status, 'complete')
      ELSE completion_status
    END,
    brief_note = COALESCE(_brief_note, brief_note),
    updated_at = now()
  WHERE session_id = _session_id;

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
    v_session.case_id,
    v_actor,
    v_role,
    'SESSION_STATUS_UPDATE',
    'SESSION',
    _session_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(jsonb_build_object('from', v_session.status, 'to', _next_status)),
    jsonb_build_object('source', 'update_session_status_hardened')
  );

  RETURN _session_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_observation_hardened(
  _case_id uuid,
  _learner_id uuid,
  _observation_type public.observation_type,
  _purpose public.observation_purpose,
  _narrative_text text DEFAULT NULL,
  _session_id uuid DEFAULT NULL,
  _goal_id uuid DEFAULT NULL,
  _observed_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_case_learner uuid;
  v_session_goal uuid;
  v_observation_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT c.learner_id INTO v_case_learner
  FROM public."case" c
  WHERE c.case_id = _case_id;

  IF v_case_learner IS NULL OR v_case_learner <> _learner_id THEN
    RAISE EXCEPTION 'Observation learner does not match case learner';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(_case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF _session_id IS NOT NULL THEN
    SELECT s.goal_id INTO v_session_goal
    FROM public."session" s
    WHERE s.session_id = _session_id
      AND s.case_id = _case_id
      AND s.learner_id = _learner_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Session does not belong to the same case and learner';
    END IF;

    IF v_session_goal IS NOT NULL AND _goal_id IS NOT NULL AND v_session_goal <> _goal_id THEN
      RAISE EXCEPTION 'Observation goal conflicts with session goal';
    END IF;
  END IF;

  IF _goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.goal g
    WHERE g.goal_id = _goal_id
      AND g.case_id = _case_id
      AND g.learner_id = _learner_id
  ) THEN
    RAISE EXCEPTION 'Goal does not belong to the same case and learner';
  END IF;

  INSERT INTO public.observation (
    case_id,
    learner_id,
    session_id,
    goal_id,
    observer_team_member_id,
    observed_at,
    observation_type,
    purpose,
    narrative_text,
    status
  )
  VALUES (
    _case_id,
    _learner_id,
    _session_id,
    _goal_id,
    v_team_member_id,
    COALESCE(_observed_at, now()),
    _observation_type,
    _purpose,
    _narrative_text,
    'draft'
  )
  RETURNING observation_id INTO v_observation_id;

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
    'OBSERVATION_CREATE',
    'OBSERVATION',
    v_observation_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(jsonb_build_object('status', 'draft')),
    jsonb_build_object('source', 'create_observation_hardened')
  );

  RETURN v_observation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_data_point_hardened(
  _observation_id uuid,
  _measurement_definition_id uuid,
  _unit public.data_point_unit,
  _outcome_code public.data_point_outcome_code,
  _value_numeric numeric DEFAULT NULL,
  _numerator numeric DEFAULT NULL,
  _denominator numeric DEFAULT NULL,
  _recorded_at timestamptz DEFAULT now()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_observation public.observation%ROWTYPE;
  v_md public.measurement_definition%ROWTYPE;
  v_team_member_id uuid;
  v_role text;
  v_org uuid;
  v_data_point_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_observation
  FROM public.observation
  WHERE observation_id = _observation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Observation not found';
  END IF;

  IF v_observation.goal_id IS NULL THEN
    RAISE EXCEPTION 'DataPoint requires an observation linked to a goal';
  END IF;

  SELECT * INTO v_md
  FROM public.measurement_definition
  WHERE measurement_definition_id = _measurement_definition_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Measurement definition not found';
  END IF;

  IF v_md.status <> 'active' THEN
    RAISE EXCEPTION 'Measurement definition must be active';
  END IF;

  IF v_md.goal_id <> v_observation.goal_id THEN
    RAISE EXCEPTION 'Measurement definition goal does not match observation goal';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.goal g
    WHERE g.goal_id = v_observation.goal_id
      AND g.case_id = v_observation.case_id
      AND g.learner_id = v_observation.learner_id
  ) THEN
    RAISE EXCEPTION 'Observation goal does not match case and learner';
  END IF;

  SELECT tm.team_member_id, tm.role_on_case, tm.organization_id
  INTO v_team_member_id, v_role, v_org
  FROM public.current_team_member_for_case(v_observation.case_id) tm;

  IF v_team_member_id IS NULL THEN
    RAISE EXCEPTION 'No case access' USING ERRCODE = '42501';
  END IF;

  IF _value_numeric IS NULL AND _numerator IS NULL AND _denominator IS NULL THEN
    RAISE EXCEPTION 'DataPoint requires at least one value field';
  END IF;

  IF _denominator IS NOT NULL AND _denominator <= 0 THEN
    RAISE EXCEPTION 'denominator must be greater than zero';
  END IF;

  INSERT INTO public.data_point (
    observation_id,
    case_id,
    learner_id,
    goal_id,
    measurement_definition_id,
    value_numeric,
    numerator,
    denominator,
    unit,
    outcome_code,
    recorded_at,
    source_mode,
    validation_status,
    recorded_by_team_member_id
  )
  VALUES (
    _observation_id,
    v_observation.case_id,
    v_observation.learner_id,
    v_observation.goal_id,
    _measurement_definition_id,
    _value_numeric,
    _numerator,
    _denominator,
    _unit,
    _outcome_code,
    COALESCE(_recorded_at, now()),
    'manual',
    'draft',
    v_team_member_id
  )
  RETURNING data_point_id INTO v_data_point_id;

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
    v_observation.case_id,
    v_actor,
    v_role,
    'DATA_POINT_CREATE',
    'DATA_POINT',
    v_data_point_id,
    1,
    'CONFIG_CHANGED',
    jsonb_build_array(
      jsonb_build_object('source_mode', 'manual'),
      jsonb_build_object('validation_status', 'draft'),
      jsonb_build_object('measurement_definition_status', v_md.status)
    ),
    jsonb_build_object('source', 'create_data_point_hardened')
  );

  RETURN v_data_point_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_session_hardened(
  uuid, uuid, public.session_type, timestamptz, timestamptz, uuid, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.update_session_status_hardened(
  uuid, public.session_status, public.session_completion_status, text
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_observation_hardened(
  uuid, uuid, public.observation_type, public.observation_purpose, text, uuid, uuid, timestamptz
) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.create_data_point_hardened(
  uuid, uuid, public.data_point_unit, public.data_point_outcome_code, numeric, numeric, numeric, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.create_session_hardened(
  uuid, uuid, public.session_type, timestamptz, timestamptz, uuid, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_session_status_hardened(
  uuid, public.session_status, public.session_completion_status, text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_observation_hardened(
  uuid, uuid, public.observation_type, public.observation_purpose, text, uuid, uuid, timestamptz
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.create_data_point_hardened(
  uuid, uuid, public.data_point_unit, public.data_point_outcome_code, numeric, numeric, numeric, timestamptz
) TO authenticated;

COMMIT;
