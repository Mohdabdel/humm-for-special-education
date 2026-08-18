import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MeasurementDefinitionRow = Database["public"]["Tables"]["measurement_definition"]["Row"];
type MeasurementType = Database["public"]["Enums"]["measurement_definition_type"];

interface ApprovedGoalOption {
  goalId: string;
  title: string;
  measurementPlanId: string;
}

const MEASUREMENT_TYPE_LABEL_AR: Record<MeasurementType, string> = {
  accuracy: "الدقة",
  frequency: "التكرار",
  duration: "المدة",
  latency: "زمن الاستجابة",
  task_analysis: "تحليل المهمة",
  prompt_level: "مستوى المساعدة",
  productivity: "الإنتاجية",
  quality: "الجودة",
  self_correction: "التصحيح الذاتي",
  generalization: "التعميم",
};

const MEASUREMENT_TYPES = Object.keys(MEASUREMENT_TYPE_LABEL_AR) as MeasurementType[];

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

async function loadApprovedGoalsWithPlans(caseId: string): Promise<ApprovedGoalOption[]> {
  // Only human-approved goals are eligible (D-05 approval gate).
  const { data: goals, error: goalsError } = await supabase
    .from("goal")
    .select("goal_id, title, human_approval_status")
    .eq("case_id", caseId)
    .eq("human_approval_status", "approved")
    .order("created_at", { ascending: true });
  if (goalsError) throw goalsError;

  const approvedGoalIds = (goals ?? []).map((g) => g.goal_id);
  if (approvedGoalIds.length === 0) return [];

  const { data: plans, error: plansError } = await supabase
    .from("measurement_plan")
    .select("measurement_plan_id, goal_id")
    .in("goal_id", approvedGoalIds);
  if (plansError) throw plansError;

  const planByGoal = new Map<string, string>();
  for (const plan of plans ?? []) {
    if (!planByGoal.has(plan.goal_id)) planByGoal.set(plan.goal_id, plan.measurement_plan_id);
  }

  return (goals ?? []).flatMap((g) => {
    const measurementPlanId = planByGoal.get(g.goal_id);
    if (!measurementPlanId) return [];
    return [{ goalId: g.goal_id, title: g.title, measurementPlanId }];
  });
}

async function loadDefinitions(goalId: string): Promise<MeasurementDefinitionRow[]> {
  const { data, error } = await supabase
    .from("measurement_definition")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface MeasurementDefinitionsSectionProps {
  caseId: string;
}

export function MeasurementDefinitionsSection({ caseId }: MeasurementDefinitionsSectionProps) {
  const queryClient = useQueryClient();
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [code, setCode] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [measurementType, setMeasurementType] = useState<MeasurementType>("accuracy");
  const [unit, setUnit] = useState("");
  const [targetCriterion, setTargetCriterion] = useState("");
  const [collectionCadence, setCollectionCadence] = useState("");
  const [supportTrackingRequired, setSupportTrackingRequired] = useState(false);

  const goalsQuery = useQuery({
    queryKey: ["approved-goals-with-plans", caseId],
    queryFn: () => loadApprovedGoalsWithPlans(caseId),
  });

  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const activeGoal = goals.find((g) => g.goalId === selectedGoalId) ?? goals[0] ?? null;

  const definitionsQuery = useQuery({
    queryKey: ["measurement-definitions", activeGoal?.goalId ?? "none"],
    queryFn: () => loadDefinitions(activeGoal?.goalId ?? ""),
    enabled: Boolean(activeGoal),
  });

  const createDefinition = useMutation({
    mutationFn: async () => {
      if (!activeGoal) throw new Error("no approved goal selected");
      const { error } = await supabase.from("measurement_definition").insert({
        measurement_plan_id: activeGoal.measurementPlanId,
        goal_id: activeGoal.goalId,
        code: code.trim(),
        label_ar: labelAr.trim(),
        measurement_type: measurementType,
        unit: unit.trim(),
        target_criterion: targetCriterion.trim(),
        collection_cadence: collectionCadence.trim(),
        support_tracking_required: supportTrackingRequired,
        status: "draft",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setCode("");
      setLabelAr("");
      setUnit("");
      setTargetCriterion("");
      setCollectionCadence("");
      setSupportTrackingRequired(false);
      await queryClient.invalidateQueries({
        queryKey: ["measurement-definitions", activeGoal?.goalId ?? "none"],
      });
    },
  });

  const activateDefinition = useMutation({
    mutationFn: async (measurementDefinitionId: string) => {
      const { error } = await supabase
        .from("measurement_definition")
        .update({ status: "active" })
        .eq("measurement_definition_id", measurementDefinitionId)
        .eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["measurement-definitions", activeGoal?.goalId ?? "none"],
      });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createDefinition.mutate();
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-card-foreground">تعريفات القياس</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        لا يمكن إنشاء تعريف قياس إلا لهدف معتمد بشريًا وله خطة قياس. الحالة الافتراضية: مسودة.
      </p>

      {goalsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل الأهداف المعتمدة…</p>
      ) : goalsQuery.error ? (
        <p className="text-sm text-destructive">تعذر تحميل الأهداف وفق سياسات الوصول.</p>
      ) : !activeGoal ? (
        <p className="text-sm text-muted-foreground">
          لا يوجد هدف معتمد لديه خطة قياس في هذه الحالة.
        </p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="md-goal" className="mb-1 block text-xs text-muted-foreground">
              الهدف المعتمد
            </label>
            <select
              id="md-goal"
              className={fieldClass}
              value={activeGoal.goalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.goalId} value={g.goalId}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium text-card-foreground">
              تعريفات القياس الحالية
            </h3>
            {definitionsQuery.isPending ? (
              <p className="text-xs text-muted-foreground">جارٍ التحميل…</p>
            ) : definitionsQuery.error ? (
              <p className="text-xs text-destructive">تعذر تحميل تعريفات القياس.</p>
            ) : (definitionsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">لا توجد تعريفات قياس لهذا الهدف.</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {(definitionsQuery.data ?? []).map((d) => (
                    <li
                      key={d.measurement_definition_id}
                      className="rounded-md border border-border p-3 text-xs text-muted-foreground"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-card-foreground">
                            {d.label_ar} <span className="text-xs text-muted-foreground">({d.code})</span>
                          </p>
                          <p className="mt-1">
                            النوع: {MEASUREMENT_TYPE_LABEL_AR[d.measurement_type]} · الوحدة: {d.unit} ·
                            الحالة: {d.status === "draft" ? "مسودة" : "مفعّل"}
                          </p>
                          <p>المعيار المستهدف: {d.target_criterion}</p>
                          <p>وتيرة الجمع: {d.collection_cadence}</p>
                          <p>
                            تتبع مستوى المساعدة: {d.support_tracking_required ? "مطلوب" : "غير مطلوب"}
                          </p>
                        </div>
                        {d.status === "draft" ? (
                          <button
                            type="button"
                            disabled={activateDefinition.isPending}
                            onClick={() => activateDefinition.mutate(d.measurement_definition_id)}
                            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
                          >
                            {activateDefinition.isPending ? "جارٍ التفعيل…" : "تفعيل"}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
                {activateDefinition.error ? (
                  <p className="text-xs text-destructive">
                    تعذر تفعيل تعريف القياس وفق سياسات الوصول.
                  </p>
                ) : null}
              </>
            )}
          </div>

          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="md-code" className="mb-1 block text-xs text-muted-foreground">
                الرمز
              </label>
              <input
                id="md-code"
                className={fieldClass}
                value={code}
                required
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="md-label" className="mb-1 block text-xs text-muted-foreground">
                التسمية بالعربية
              </label>
              <input
                id="md-label"
                className={fieldClass}
                value={labelAr}
                required
                onChange={(e) => setLabelAr(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="md-type" className="mb-1 block text-xs text-muted-foreground">
                نوع القياس
              </label>
              <select
                id="md-type"
                className={fieldClass}
                value={measurementType}
                onChange={(e) => setMeasurementType(e.target.value as MeasurementType)}
              >
                {MEASUREMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {MEASUREMENT_TYPE_LABEL_AR[t]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="md-unit" className="mb-1 block text-xs text-muted-foreground">
                الوحدة
              </label>
              <input
                id="md-unit"
                className={fieldClass}
                value={unit}
                required
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="md-criterion" className="mb-1 block text-xs text-muted-foreground">
                المعيار المستهدف
              </label>
              <input
                id="md-criterion"
                className={fieldClass}
                value={targetCriterion}
                required
                onChange={(e) => setTargetCriterion(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="md-cadence" className="mb-1 block text-xs text-muted-foreground">
                وتيرة الجمع
              </label>
              <input
                id="md-cadence"
                className={fieldClass}
                value={collectionCadence}
                required
                onChange={(e) => setCollectionCadence(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground md:col-span-2">
              <input
                type="checkbox"
                checked={supportTrackingRequired}
                onChange={(e) => setSupportTrackingRequired(e.target.checked)}
              />
              يتطلب تتبع مستوى المساعدة
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={createDefinition.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {createDefinition.isPending ? "جارٍ الحفظ…" : "حفظ تعريف القياس (مسودة)"}
              </button>
              {createDefinition.error ? (
                <p className="mt-2 text-xs text-destructive">
                  تعذر حفظ تعريف القياس وفق سياسات الوصول أو قواعد الاعتماد.
                </p>
              ) : null}
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
