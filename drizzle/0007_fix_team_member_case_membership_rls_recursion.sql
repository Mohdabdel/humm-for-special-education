CREATE OR REPLACE FUNCTION public.is_own_team_member(_team_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_member tm
    WHERE tm.team_member_id = _team_member_id
      AND tm.user_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.shares_active_case_with_current_user(_team_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.case_membership target_cm
    JOIN public.case_membership my_cm
      ON my_cm.case_id = target_cm.case_id
    JOIN public.team_member my_tm
      ON my_tm.team_member_id = my_cm.team_member_id
    WHERE target_cm.team_member_id = _team_member_id
      AND target_cm.ended_at IS NULL
      AND my_cm.ended_at IS NULL
      AND my_tm.user_id = auth.uid()
  )
$function$;

DROP POLICY IF EXISTS case_membership_select_own ON public.case_membership;
CREATE POLICY case_membership_select_own
ON public.case_membership
FOR SELECT
TO authenticated
USING (public.is_own_team_member(team_member_id));

DROP POLICY IF EXISTS team_member_select_shared_cases ON public.team_member;
CREATE POLICY team_member_select_shared_cases
ON public.team_member
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.shares_active_case_with_current_user(team_member_id)
);
