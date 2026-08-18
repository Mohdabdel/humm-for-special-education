DROP POLICY IF EXISTS learner_select_case_members ON public.learner;
DROP POLICY IF EXISTS team_member_select_shared_cases ON public.team_member;

GRANT SELECT ON public.learner TO authenticated;
GRANT SELECT ON public.team_member TO authenticated;

ALTER TABLE public.learner ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member ENABLE ROW LEVEL SECURITY;

CREATE POLICY learner_select_case_members ON public.learner
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public."case" c
               WHERE c.learner_id = learner.learner_id
                 AND public.has_case_access(c.case_id)));

CREATE POLICY team_member_select_shared_cases ON public.team_member
FOR SELECT TO authenticated
USING (
  team_member.user_id = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.case_membership target_cm
    JOIN public.case_membership my_cm ON my_cm.case_id = target_cm.case_id
    JOIN public.team_member my_tm ON my_tm.team_member_id = my_cm.team_member_id
    WHERE target_cm.team_member_id = team_member.team_member_id
      AND target_cm.ended_at IS NULL
      AND my_cm.ended_at IS NULL
      AND my_tm.user_id = auth.uid()
  )
);