import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type GoalRow = Database["public"]["Tables"]["goal"]["Row"];
type NeedRow = Database["public"]["Tables"]["need"]["Row"];
type GoalType = Database["public"]["Enums"]["goal_type"];
type GoalStatus = Database["public"]["Enums"]["goal_status"];
type GoalApproval = Database["public"]["Enums"]["goal_human_approval_status"];

const GOAL_TYPE_LABEL_AR: Record<GoalType, string> = {
  academic: "أكاديمي",
  communication: "تواصل",
  behavior: "سلوك",
  functional: "وظيفي",
  adaptive: "تكيفي",
  vocational: "مهني",
  transition: "انتقال",
  therapy: "علاجي",
  self_determination: "تقرير المصير",
};

const GOAL_STATUS_LABEL_AR: Record<GoalStatus, string> = {
  draft: "مسودة",
  in_review: "قيد المراجعة",
  approved: "معتمد",
  active: "نشط",
  paused: "متوقف مؤقتًا",
  generalization_pending: "بانتظار التعميم",
  generalized: "معمَّم",
  revised: "مُراجَع",
  closed: "مغلق",
  archived: "مؤرشف",
};

const APPROVAL_LABEL_AR: Record<GoalApproval, string> = {
  pending: "بانتظار الاعتماد البشري",
  approved: "معتمد",
  approved_with_conditions: "معتمد بشروط",
  rejected: "مرفوض",
};

async function loadGoals(caseId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goal")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function loadNeeds(caseId: string): Promise<NeedRow[]> {
  const { data, error } = await supabase
    .from("need")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

type MembershipRole = Database["public"]["Enums"]["case_membership_role"];

const AUTHOR_ROLES: MembershipRole[] = ["special_educator", "therapist"];
const REVIEWER_ROLES: MembershipRole[] = ["supervisor", "case_manager"];

async function loadCaseRoles(caseId: string): Promise<MembershipRole[]> {
  const { data, error } = await supabase
    .from("case_membership")
    .select("role")
    .eq("case_id", caseId)
    .is("ended_at", null);
  if (error) throw error;
  return (data ?? []).map((r) => r.role);
}

async function loadCurrentTeamMemberId(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null;
  const { data, error } = await supabase
    .from("team_member")
    .select("team_member_id")
    .eq("user_id", userId)
    .limit(1);
  if (error) throw error;
  return data?.[0]?.team_member_id ?? null;
}

interface GoalsSectionProps {
  caseId: string;
  learnerId: string;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function GoalsSection({ caseId, learnerId }: GoalsSectionProps) {
  const queryClient = useQueryClient();
  const [needId, setNeedId] = useState("");
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("academic");
  const [observableBehavior, setObservableBehavior] = useState("");
  const [baselineSummary, setBaselineSummary] = useState("");
  const [criterion, setCriterion] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [conditions, setConditions] = useState("");
  const [allowedSupports, setAllowedSupports] = useState("");
  const [functionalContext, setFunctionalContext] = useState("");

  const goalsQuery = useQuery({ queryKey: ["goals", caseId], queryFn: () => loadGoals(caseId) });
  const needsQuery = useQuery({ queryKey: ["needs", caseId], queryFn: () => loadNeeds(caseId) });
  const teamMemberQuery = useQuery({
    queryKey: ["current-team-member"],
    queryFn: loadCurrentTeamMemberId,
  });

  const needs = needsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];
  const teamMemberId = teamMemberQuery.data ?? null;

  const createGoal = useMutation({
    mutationFn: async () => {
      if (!teamMemberId) throw new Error("no_team_member");
      const selectedNeed = needs.find((n) => n.need_id === needId);
      if (!selectedNeed) throw new Error("need_required");

      const { data: inserted, error: goalError } = await supabase
        .from("goal")
        .insert({
          case_id: caseId,
          learner_id: learnerId,
          domain_id: selectedNeed.domain_id ?? null,
          goal_type: goalType,
          title: title.trim(),
          status: "draft",
          owner_team_member_id: teamMemberId,
          observable_behavior: observableBehavior.trim(),
          baseline_summary: baselineSummary.trim(),
          criterion: criterion.trim(),
          timeframe: timeframe.trim(),
          conditions: conditions.trim() || null,
          allowed_supports: allowedSupports.trim() || null,
          functional_context: functionalContext.trim() || null,
          human_approval_status: "pending",
        })
        .select("goal_id")
        .single();
      if (goalError) throw goalError;

      const { error: linkError } = await supabase.from("goal_need_link").insert({
        goal_id: inserted.goal_id,
        need_id: selectedNeed.need_id,
        relationship_type: "directly_addresses",
        primary_link: true,
        rationale: `هدف مشتق مباشرة من الاحتياج: ${selectedNeed.title}`,
      });
      if (linkError) throw linkError;
    },
    onSuccess: async () => {
      setTitle("");
      setObservableBehavior("");
      setBaselineSummary("");
      setCriterion("");
      setTimeframe("");
      setConditions("");
      setAllowedSupports("");
      setFunctionalContext("");
      await queryClient.invalidateQueries({ queryKey: ["goals", caseId] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!needId) return;
    createGoal.mutate();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">مسودات الأهداف</h2>

      {goalsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل الأهداف…</p>
      ) : goalsQuery.error ? (
        <p className="text-sm text-destructive">تعذر تحميل الأهداف وفق سياسات الوصول.</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد أهداف مسجَّلة لهذه الحالة.</p>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => (
            <li
              key={g.goal_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium text-card-foreground">{g.title}</span>
              <span className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {GOAL_TYPE_LABEL_AR[g.goal_type]}
                </span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                  {GOAL_STATUS_LABEL_AR[g.status]}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {APPROVAL_LABEL_AR[g.human_approval_status]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">
          إنشاء مسودة هدف من احتياج
        </h3>

        {teamMemberQuery.isPending || needsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">جارٍ التحضير…</p>
        ) : teamMemberQuery.error ? (
          <p className="text-sm text-destructive">
            تعذر التحقق من ارتباط المستخدم بعضو فريق وفق سياسات الوصول.
          </p>
        ) : !teamMemberId ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            لا يوجد عضو فريق مرتبط بحساب المستخدم الحالي. يجب ربط الحساب بعضو فريق قبل إنشاء
            الأهداف.
          </p>
        ) : needs.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            لا يمكن إنشاء هدف بدون احتياج موثَّق. يجب إنشاء احتياج لهذه الحالة أولًا.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="goal-need" className="mb-1 block text-xs text-muted-foreground">
                الاحتياج المصدر (إلزامي)
              </label>
              <select
                id="goal-need"
                className={fieldClass}
                value={needId}
                required
                onChange={(e) => setNeedId(e.target.value)}
              >
                <option value="" disabled>
                  اختر احتياجًا…
                </option>
                {needs.map((n) => (
                  <option key={n.need_id} value={n.need_id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label htmlFor="goal-title" className="mb-1 block text-xs text-muted-foreground">
                  عنوان الهدف
                </label>
                <input
                  id="goal-title"
                  className={fieldClass}
                  value={title}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="goal-type" className="mb-1 block text-xs text-muted-foreground">
                  نوع الهدف
                </label>
                <select
                  id="goal-type"
                  className={fieldClass}
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as GoalType)}
                >
                  {(Object.keys(GOAL_TYPE_LABEL_AR) as GoalType[]).map((k) => (
                    <option key={k} value={k}>
                      {GOAL_TYPE_LABEL_AR[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="goal-behavior" className="mb-1 block text-xs text-muted-foreground">
                السلوك القابل للملاحظة
              </label>
              <textarea
                id="goal-behavior"
                className={fieldClass}
                rows={2}
                value={observableBehavior}
                required
                onChange={(e) => setObservableBehavior(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="goal-baseline" className="mb-1 block text-xs text-muted-foreground">
                ملخص خط الأساس
              </label>
              <textarea
                id="goal-baseline"
                className={fieldClass}
                rows={2}
                value={baselineSummary}
                required
                onChange={(e) => setBaselineSummary(e.target.value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label
                  htmlFor="goal-criterion"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  معيار الإتقان
                </label>
                <input
                  id="goal-criterion"
                  className={fieldClass}
                  value={criterion}
                  required
                  onChange={(e) => setCriterion(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="goal-timeframe"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  الإطار الزمني
                </label>
                <input
                  id="goal-timeframe"
                  className={fieldClass}
                  value={timeframe}
                  required
                  onChange={(e) => setTimeframe(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label
                  htmlFor="goal-conditions"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  الظروف (اختياري)
                </label>
                <input
                  id="goal-conditions"
                  className={fieldClass}
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="goal-supports"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  الدعم المسموح (اختياري)
                </label>
                <input
                  id="goal-supports"
                  className={fieldClass}
                  value={allowedSupports}
                  onChange={(e) => setAllowedSupports(e.target.value)}
                />
              </div>
              <div>
                <label
                  htmlFor="goal-context"
                  className="mb-1 block text-xs text-muted-foreground"
                >
                  السياق الوظيفي (اختياري)
                </label>
                <input
                  id="goal-context"
                  className={fieldClass}
                  value={functionalContext}
                  onChange={(e) => setFunctionalContext(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={createGoal.isPending || !needId}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {createGoal.isPending ? "جارٍ الحفظ…" : "حفظ مسودة الهدف"}
            </button>

            {createGoal.error ? (
              <p className="text-sm text-destructive">
                تعذر حفظ الهدف. تأكد من اكتمال الحقول ومن صلاحيات الوصول.
              </p>
            ) : null}

            <p className="text-xs text-muted-foreground">
              كل هدف يُحفظ كمسودة بانتظار الاعتماد البشري، ولا يمكن إنشاؤه بدون احتياج مصدر.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
