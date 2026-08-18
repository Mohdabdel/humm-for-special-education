import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type DataPointRow = Database["public"]["Tables"]["data_point"]["Row"];
type GoalRow = Database["public"]["Tables"]["goal"]["Row"];
type MeasurementDefinitionRow = Database["public"]["Tables"]["measurement_definition"]["Row"];

async function loadGoals(caseId: string): Promise<GoalRow[]> {
  const { data, error } = await supabase
    .from("goal")
    .select("goal_id, title")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function loadDataPoints(goalId: string): Promise<DataPointRow[]> {
  const { data, error } = await supabase
    .from("data_point")
    .select("*")
    .eq("goal_id", goalId)
    .order("recorded_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function loadDefinitionsByIds(ids: string[]): Promise<MeasurementDefinitionRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("measurement_definition")
    .select("measurement_definition_id, label_ar")
    .in("measurement_definition_id", ids);
  if (error) throw error;
  return data ?? [];
}

interface ProgressHistorySectionProps {
  caseId: string;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

function formatAr(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function formatValue(dp: DataPointRow): string {
  if (dp.value_numeric !== null && dp.value_numeric !== undefined) return String(dp.value_numeric);
  if (dp.numerator !== null && dp.denominator !== null) {
    return `${dp.numerator} / ${dp.denominator}`;
  }
  if (dp.numerator !== null) return String(dp.numerator);
  if (dp.denominator !== null) return String(dp.denominator);
  return "—";
}

export function ProgressHistorySection({ caseId }: ProgressHistorySectionProps) {
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");

  const goalsQuery = useQuery({ queryKey: ["goals", caseId], queryFn: () => loadGoals(caseId) });
  const goals = useMemo(() => goalsQuery.data ?? [], [goalsQuery.data]);
  const activeGoal = goals.find((g) => g.goal_id === selectedGoalId) ?? goals[0] ?? null;

  const dataPointsQuery = useQuery({
    queryKey: ["data-points-history", activeGoal?.goal_id ?? "none"],
    queryFn: () => loadDataPoints(activeGoal?.goal_id ?? ""),
    enabled: Boolean(activeGoal),
  });

  const dataPoints = dataPointsQuery.data ?? [];
  const definitionIds = useMemo(
    () => Array.from(new Set(dataPoints.map((dp) => dp.measurement_definition_id))),
    [dataPoints],
  );

  const definitionsQuery = useQuery({
    queryKey: ["measurement-definition-labels", ...definitionIds.sort()],
    queryFn: () => loadDefinitionsByIds(definitionIds),
    enabled: definitionIds.length > 0,
  });

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of definitionsQuery.data ?? []) {
      map.set(d.measurement_definition_id, d.label_ar);
    }
    return map;
  }, [definitionsQuery.data]);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-card-foreground">سجل التقدم</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        عرض نقاط البيانات المسجَّلة لهدف محدد، مرتبة حسب وقت التسجيل تنازليًا.
      </p>

      {goalsQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل الأهداف…</p>
      ) : goalsQuery.error ? (
        <p className="text-sm text-destructive">تعذر تحميل الأهداف وفق سياسات الوصول.</p>
      ) : !activeGoal ? (
        <p className="text-sm text-muted-foreground">لا توجد أهداف مسجَّلة لهذه الحالة.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label htmlFor="history-goal" className="mb-1 block text-xs text-muted-foreground">
              الهدف
            </label>
            <select
              id="history-goal"
              className={fieldClass}
              value={activeGoal.goal_id}
              onChange={(e) => setSelectedGoalId(e.target.value)}
            >
              {goals.map((g) => (
                <option key={g.goal_id} value={g.goal_id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          {dataPointsQuery.isPending ? (
            <p className="text-xs text-muted-foreground">جارٍ تحميل سجل التقدم…</p>
          ) : dataPointsQuery.error ? (
            <p className="text-xs text-destructive">تعذر تحميل سجل التقدم.</p>
          ) : dataPoints.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              لا توجد نقاط بيانات مسجَّلة لهذا الهدف بعد.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-right text-xs font-medium">وقت التسجيل</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">مؤشر القياس</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">القيمة</th>
                    <th className="px-3 py-2 text-right text-xs font-medium">الوحدة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {dataPoints.map((dp) => (
                    <tr key={dp.data_point_id}>
                      <td className="px-3 py-2 text-card-foreground">{formatAr(dp.recorded_at)}</td>
                      <td className="px-3 py-2 text-card-foreground">
                        {labelById.get(dp.measurement_definition_id) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-card-foreground">{formatValue(dp)}</td>
                      <td className="px-3 py-2 text-card-foreground">{dp.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
