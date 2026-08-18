import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type MeasurementPlanRow = Database["public"]["Tables"]["measurement_plan"]["Row"];

async function loadMeasurementPlan(goalId: string): Promise<MeasurementPlanRow | null> {
  const { data, error } = await supabase
    .from("measurement_plan")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

interface MeasurementPlanPanelProps {
  goalId: string;
}

export function MeasurementPlanPanel({ goalId }: MeasurementPlanPanelProps) {
  const queryClient = useQueryClient();
  const [measurementType, setMeasurementType] = useState("");
  const [targetCriterion, setTargetCriterion] = useState("");

  const planQuery = useQuery({
    queryKey: ["measurement-plan", goalId],
    queryFn: () => loadMeasurementPlan(goalId),
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("measurement_plan").insert({
        goal_id: goalId,
        measurement_type: measurementType.trim(),
        target_criterion: targetCriterion.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setMeasurementType("");
      setTargetCriterion("");
      await queryClient.invalidateQueries({ queryKey: ["measurement-plan", goalId] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createPlan.mutate();
  }

  const plan = planQuery.data ?? null;

  return (
    <div className="mt-2 w-full rounded-md border border-dashed border-border bg-muted/30 p-3">
      <h4 className="mb-2 text-xs font-semibold text-card-foreground">خطة القياس</h4>

      {planQuery.isPending ? (
        <p className="text-xs text-muted-foreground">جارٍ تحميل خطة القياس…</p>
      ) : planQuery.error ? (
        <p className="text-xs text-destructive">تعذر تحميل خطة القياس وفق سياسات الوصول.</p>
      ) : plan ? (
        <dl className="grid gap-1 text-xs text-muted-foreground">
          <div className="flex gap-2">
            <dt className="font-medium text-card-foreground">طريقة القياس:</dt>
            <dd>{plan.measurement_type}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="font-medium text-card-foreground">المعيار المستهدف:</dt>
            <dd>{plan.target_criterion}</dd>
          </div>
        </dl>
      ) : (
        <form onSubmit={onSubmit} className="space-y-2">
          <div>
            <label
              htmlFor={`mp-type-${goalId}`}
              className="mb-1 block text-xs text-muted-foreground"
            >
              طريقة القياس
            </label>
            <input
              id={`mp-type-${goalId}`}
              className={fieldClass}
              value={measurementType}
              required
              onChange={(e) => setMeasurementType(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor={`mp-criterion-${goalId}`}
              className="mb-1 block text-xs text-muted-foreground"
            >
              المعيار المستهدف
            </label>
            <input
              id={`mp-criterion-${goalId}`}
              className={fieldClass}
              value={targetCriterion}
              required
              onChange={(e) => setTargetCriterion(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={createPlan.isPending}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-60"
          >
            {createPlan.isPending ? "جارٍ الحفظ…" : "حفظ خطة القياس"}
          </button>
          {createPlan.error ? (
            <p className="text-xs text-destructive">
              تعذر حفظ خطة القياس. لا يمكن إنشاء خطة إلا لهدف معتمد بشريًا.
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
