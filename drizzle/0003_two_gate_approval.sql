-- HIMAM — Goal & Plan Studio, STEP 4
-- Two-gate human approval enforcement at the database level.
-- NOT APPLIED. Review only.

--------------------------------------------------------------------------------
-- D-05: no measurement plan without an approved (human-reviewed) goal.
-- Enforced by trigger (not CHECK) because it depends on another table.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_measurement_plan_requires_approved_goal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval public.goal_human_approval_status;
BEGIN
  SELECT g.human_approval_status
    INTO v_approval
    FROM public.goal g
   WHERE g.goal_id = NEW.goal_id;

  IF v_approval IS NULL THEN
    RAISE EXCEPTION 'measurement_plan: parent goal % not found', NEW.goal_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF v_approval <> 'approved' THEN
    RAISE EXCEPTION
      'measurement_plan blocked: goal % is not human-approved (current status: %)',
      NEW.goal_id, v_approval
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS measurement_plan_requires_approved_goal ON public.measurement_plan;
CREATE TRIGGER measurement_plan_requires_approved_goal
BEFORE INSERT OR UPDATE ON public.measurement_plan
FOR EACH ROW
EXECUTE FUNCTION public.enforce_measurement_plan_requires_approved_goal();

--------------------------------------------------------------------------------
-- Gate A: draft -> in_review only by the owning team member.
-- Gate B: approval/rejection only while OLD.status = 'in_review', and only for a
-- case_membership role of supervisor or case_manager.
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_goal_approval_gates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval_changed boolean;
  v_is_reviewer boolean;
  v_is_owner boolean;
BEGIN
  v_approval_changed :=
       NEW.human_approval_status IS DISTINCT FROM OLD.human_approval_status
    OR NEW.approved_by_team_member_id IS DISTINCT FROM OLD.approved_by_team_member_id
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR (OLD.status <> NEW.status AND NEW.status IN ('approved', 'active'));

  -- GATE A
  IF OLD.status = 'draft' AND NEW.status = 'in_review' THEN
    IF v_approval_changed THEN
      RAISE EXCEPTION 'goal gate A: finalize-for-review must not change approval fields'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.team_member tm
      WHERE tm.team_member_id = OLD.owner_team_member_id
        AND tm.user_id = auth.uid()
    ) INTO v_is_owner;

    IF NOT v_is_owner THEN
      RAISE EXCEPTION 'goal gate A: only the goal owner may finalize it for review'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
  END IF;

  -- GATE B
  IF v_approval_changed THEN
    IF OLD.status <> 'in_review' THEN
      RAISE EXCEPTION
        'goal gate B: approval/rejection requires goal.status = in_review (current: %)',
        OLD.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status NOT IN ('approved', 'approved_with_conditions', 'rejected') THEN
      RAISE EXCEPTION 'goal gate B: invalid target approval status %', NEW.human_approval_status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status IN ('approved', 'approved_with_conditions')
       AND NEW.status <> 'approved' THEN
      RAISE EXCEPTION 'goal gate B: approved goal must move to status approved'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status = 'rejected' AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'goal gate B: rejected goal must move back to status draft'
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT EXISTS (
      SELECT 1
      FROM public.case_membership cm
      JOIN public.team_member tm ON tm.team_member_id = cm.team_member_id
      WHERE cm.case_id = OLD.case_id
        AND cm.ended_at IS NULL
        AND cm.role IN ('supervisor', 'case_manager')
        AND tm.user_id = auth.uid()
    ) INTO v_is_reviewer;

    IF NOT v_is_reviewer THEN
      RAISE EXCEPTION 'goal gate B: only supervisor or case_manager may approve or reject'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.approved_by_team_member_id IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'goal gate B: approved_by_team_member_id and approved_at are required'
        USING ERRCODE = 'check_violation';
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS goal_approval_gates ON public.goal;
CREATE TRIGGER goal_approval_gates
BEFORE UPDATE ON public.goal
FOR EACH ROW
EXECUTE FUNCTION public.enforce_goal_approval_gates();
