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
-- Two-gate approval model.
-- GATE A: draft -> in_review, only by the goal owner, and only when that owner
--         has an active case_membership role of special_educator or therapist.
-- GATE B: approval/rejection only while OLD.status = 'in_review', only by the
--         acting user themselves, and only with an active case_membership role
--         of supervisor or case_manager. MVP outcomes only:
--         approved  -> human_approval_status='approved',  status='approved'
--         rejected  -> human_approval_status='rejected',  status='draft'
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_goal_approval_gates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval_changed boolean;
  v_actor_team_member_id uuid;
  v_owner_is_actor boolean;
  v_owner_has_author_role boolean;
  v_actor_is_reviewer boolean;
BEGIN
  v_approval_changed :=
       NEW.human_approval_status IS DISTINCT FROM OLD.human_approval_status
    OR NEW.approved_by_team_member_id IS DISTINCT FROM OLD.approved_by_team_member_id
    OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
    OR (OLD.status <> NEW.status AND NEW.status IN ('approved', 'active'));

  ------------------------------------------------------------------ GATE A
  IF OLD.status = 'draft' AND NEW.status = 'in_review' THEN
    IF v_approval_changed THEN
      RAISE EXCEPTION 'goal gate A: finalize-for-review must not change approval fields'
        USING ERRCODE = 'check_violation';
    END IF;

    -- the acting user must be the goal owner
    SELECT EXISTS (
      SELECT 1 FROM public.team_member tm
      WHERE tm.team_member_id = OLD.owner_team_member_id
        AND tm.user_id = auth.uid()
    ) INTO v_owner_is_actor;

    IF NOT v_owner_is_actor THEN
      RAISE EXCEPTION 'goal gate A: only the goal owner may finalize it for review'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- and that owner must hold an active authoring role on this case
    SELECT EXISTS (
      SELECT 1
      FROM public.case_membership cm
      WHERE cm.case_id = OLD.case_id
        AND cm.team_member_id = OLD.owner_team_member_id
        AND cm.ended_at IS NULL
        AND cm.role IN ('special_educator', 'therapist')
    ) INTO v_owner_has_author_role;

    IF NOT v_owner_has_author_role THEN
      RAISE EXCEPTION
        'goal gate A: goal owner must have an active special_educator or therapist membership on this case'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    RETURN NEW;
  END IF;

  ------------------------------------------------------------------ GATE B
  IF v_approval_changed THEN
    IF OLD.status <> 'in_review' THEN
      RAISE EXCEPTION
        'goal gate B: approval/rejection requires goal.status = in_review (current: %)',
        OLD.status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'goal gate B: invalid target approval status % (MVP allows approved or rejected only)',
        NEW.human_approval_status
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status = 'approved' AND NEW.status <> 'approved' THEN
      RAISE EXCEPTION 'goal gate B: approved goal must move to status approved'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.human_approval_status = 'rejected' AND NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'goal gate B: rejected goal must move back to status draft'
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.approved_by_team_member_id IS NULL OR NEW.approved_at IS NULL THEN
      RAISE EXCEPTION 'goal gate B: approved_by_team_member_id and approved_at are required'
        USING ERRCODE = 'check_violation';
    END IF;

    -- resolve the acting user's own team_member row
    SELECT tm.team_member_id
      INTO v_actor_team_member_id
      FROM public.team_member tm
     WHERE tm.user_id = auth.uid()
     LIMIT 1;

    IF v_actor_team_member_id IS NULL THEN
      RAISE EXCEPTION 'goal gate B: acting user is not linked to a team member'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- approver must be the acting user themselves
    IF NEW.approved_by_team_member_id <> v_actor_team_member_id THEN
      RAISE EXCEPTION 'goal gate B: approved_by_team_member_id must be the acting team member'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- and that team member must hold an active reviewer role on this case
    SELECT EXISTS (
      SELECT 1
      FROM public.case_membership cm
      WHERE cm.case_id = OLD.case_id
        AND cm.team_member_id = v_actor_team_member_id
        AND cm.ended_at IS NULL
        AND cm.role IN ('supervisor', 'case_manager')
    ) INTO v_actor_is_reviewer;

    IF NOT v_actor_is_reviewer THEN
      RAISE EXCEPTION 'goal gate B: only supervisor or case_manager may approve or reject'
        USING ERRCODE = 'insufficient_privilege';
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