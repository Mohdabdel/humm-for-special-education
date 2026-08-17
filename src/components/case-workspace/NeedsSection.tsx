import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type NeedRow = Database["public"]["Tables"]["need"]["Row"];
type NeedType = Database["public"]["Enums"]["need_type"];
type NeedPriorityLevel = Database["public"]["Enums"]["need_priority_level"];
type NeedPriorityBasis = Database["public"]["Enums"]["need_priority_basis"];
type NeedStatus = Database["public"]["Enums"]["need_status"];

const NEED_TYPE_LABEL_AR: Record<NeedType, string> = {
  skill_gap: "فجوة مهارية",
  access_barrier: "عائق وصول",
  environmental_barrier: "عائق بيئي",
  communication: "تواصل",
  behavior: "سلوك",
  functional: "وظيفي",
  vocational: "مهني",
  transition: "انتقال",
  safety: "سلامة",
  assessment_gap: "فجوة تقييم",
};

const PRIORITY_LABEL_AR: Record<NeedPriorityLevel, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "مرتفعة",
  critical: "حرجة",
};

const BASIS_LABEL_AR: Record<NeedPriorityBasis, string> = {
  assessment: "تقييم",
  learner_priority: "أولوية المتعلم",
  family_priority: "أولوية الأسرة",
  team_decision: "قرار الفريق",
  transition_requirement: "متطلب انتقال",
  safety: "سلامة",
};

const STATUS_LABEL_AR: Record<NeedStatus, string> = {
  draft: "مسودة",
  active: "نشطة",
  addressed_by_goal: "معالَجة بهدف",
  addressed_by_support: "معالَجة بدعم",
  monitor: "قيد المراقبة",
  deferred: "مؤجلة",
  resolved: "مُنجزة",
  archived: "مؤرشفة",
};

async function loadNeeds(caseId: string): Promise<NeedRow[]> {
  const { data, error } = await supabase
    .from("need")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
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

interface NeedsSectionProps {
  caseId: string;
  learnerId: string;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function NeedsSection({ caseId, learnerId }: NeedsSectionProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [functionalImpact, setFunctionalImpact] = useState("");
  const [needType, setNeedType] = useState<NeedType>("skill_gap");
  const [priorityLevel, setPriorityLevel] = useState<NeedPriorityLevel>("medium");
  const [priorityBasis, setPriorityBasis] = useState<NeedPriorityBasis>("assessment");

  const needsQuery = useQuery({
    queryKey: ["needs", caseId],
    queryFn: () => loadNeeds(caseId),
  });

  const teamMemberQuery = useQuery({
    queryKey: ["current-team-member"],
    queryFn: loadCurrentTeamMemberId,
  });

  const teamMemberId = teamMemberQuery.data ?? null;

  const createNeed = useMutation({
    mutationFn: async () => {
      if (!teamMemberId) throw new Error("no_team_member");
      const { error } = await supabase.from("need").insert({
        case_id: caseId,
        learner_id: learnerId,
        title: title.trim(),
        description: description.trim(),
        functional_impact: functionalImpact.trim(),
        need_type: needType,
        priority_level: priorityLevel,
        priority_basis: priorityBasis,
        status: "draft",
        source_confidence: "medium",
        identified_by_team_member_id: teamMemberId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setTitle("");
      setDescription("");
      setFunctionalImpact("");
      await queryClient.invalidateQueries({ queryKey: ["needs", caseId] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createNeed.mutate();
  }

  const needs = needsQuery.data ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">الاحتياجات</h2>

      {needsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل الاحتياجات…</p>
      ) : needsQuery.error ? (
        <p className="text-sm text-destructive">تعذر تحميل الاحتياجات وفق سياسات الوصول.</p>
      ) : needs.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد احتياجات مسجَّلة لهذه الحالة.</p>
      ) : (
        <ul className="space-y-2">
          {needs.map((n) => (
            <li
              key={n.need_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium text-card-foreground">{n.title}</span>
              <span className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                  {NEED_TYPE_LABEL_AR[n.need_type]}
                </span>
                <span className="rounded-full bg-accent px-2 py-0.5 text-accent-foreground">
                  {PRIORITY_LABEL_AR[n.priority_level]}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                  {STATUS_LABEL_AR[n.status]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">إضافة احتياج جديد</h3>

        {teamMemberQuery.isPending ? (
          <p className="text-sm text-muted-foreground">جارٍ التحقق من عضوية الفريق…</p>
        ) : teamMemberQuery.error ? (
          <p className="text-sm text-destructive">
            تعذر التحقق من ارتباط المستخدم بعضو فريق وفق سياسات الوصول.
          </p>
        ) : !teamMemberId ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            لا يوجد عضو فريق مرتبط بحساب المستخدم الحالي. يجب ربط الحساب بعضو فريق قبل إنشاء
            الاحتياجات.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label htmlFor="need-title" className="mb-1 block text-xs text-muted-foreground">
                العنوان
              </label>
              <input
                id="need-title"
                className={fieldClass}
                value={title}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="need-desc" className="mb-1 block text-xs text-muted-foreground">
                الوصف
              </label>
              <textarea
                id="need-desc"
                className={fieldClass}
                rows={3}
                value={description}
                required
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="need-impact" className="mb-1 block text-xs text-muted-foreground">
                الأثر الوظيفي
              </label>
              <textarea
                id="need-impact"
                className={fieldClass}
                rows={3}
                value={functionalImpact}
                required
                onChange={(e) => setFunctionalImpact(e.target.value)}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label htmlFor="need-type" className="mb-1 block text-xs text-muted-foreground">
                  نوع الاحتياج
                </label>
                <select
                  id="need-type"
                  className={fieldClass}
                  value={needType}
                  onChange={(e) => setNeedType(e.target.value as NeedType)}
                >
                  {(Object.keys(NEED_TYPE_LABEL_AR) as NeedType[]).map((k) => (
                    <option key={k} value={k}>
                      {NEED_TYPE_LABEL_AR[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="need-priority" className="mb-1 block text-xs text-muted-foreground">
                  مستوى الأولوية
                </label>
                <select
                  id="need-priority"
                  className={fieldClass}
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value as NeedPriorityLevel)}
                >
                  {(Object.keys(PRIORITY_LABEL_AR) as NeedPriorityLevel[]).map((k) => (
                    <option key={k} value={k}>
                      {PRIORITY_LABEL_AR[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="need-basis" className="mb-1 block text-xs text-muted-foreground">
                  أساس الأولوية
                </label>
                <select
                  id="need-basis"
                  className={fieldClass}
                  value={priorityBasis}
                  onChange={(e) => setPriorityBasis(e.target.value as NeedPriorityBasis)}
                >
                  {(Object.keys(BASIS_LABEL_AR) as NeedPriorityBasis[]).map((k) => (
                    <option key={k} value={k}>
                      {BASIS_LABEL_AR[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {createNeed.error ? (
              <p className="text-sm text-destructive">
                تعذر حفظ الاحتياج. تأكد من صلاحيات الوصول للحالة.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={createNeed.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {createNeed.isPending ? "جارٍ الحفظ…" : "حفظ الاحتياج (مسودة)"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
