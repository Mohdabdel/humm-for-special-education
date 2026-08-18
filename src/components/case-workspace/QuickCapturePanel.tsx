import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ObservationType = Database["public"]["Enums"]["observation_type"];
type ObservationPurpose = Database["public"]["Enums"]["observation_purpose"];
type DataPointUnit = Database["public"]["Enums"]["data_point_unit"];
type DataPointOutcomeCode = Database["public"]["Enums"]["data_point_outcome_code"];
type SessionCompletionStatus = Database["public"]["Enums"]["session_completion_status"];

const DATA_POINT_UNIT_LABEL_AR: Record<DataPointUnit, string> = {
  percent: "نسبة مئوية",
  count: "عدد",
  duration_seconds: "مدة (ثوانٍ)",
  duration_minutes: "مدة (دقائق)",
  latency_seconds: "زمن الاستجابة (ثوانٍ)",
  rate: "معدل",
  rubric_score: "درجة روبرك",
  prompt_level: "مستوى التلميح",
  productivity_rate: "معدل الإنتاجية",
};

const DATA_POINT_OUTCOME_LABEL_AR: Record<DataPointOutcomeCode, string> = {
  success: "ناجح",
  partial: "جزئي",
  unsuccessful: "غير ناجح",
  not_applicable: "غير منطبق",
};

const SESSION_COMPLETION_LABEL_AR: Record<SessionCompletionStatus, string> = {
  complete: "مكتملة",
  partial: "جزئية",
  not_completed: "غير مكتملة",
};


const OBSERVATION_TYPE_LABEL_AR: Record<ObservationType, string> = {
  structured: "منظَّمة",
  narrative: "سردية",
  ABC: "سابق-سلوك-لاحق",
  functional: "وظيفية",
  classroom: "صفية",
  family_report: "تقرير أسرة",
  learner_report: "تقرير متعلم",
  task_performance: "أداء مهمة",
};

const OBSERVATION_PURPOSE_LABEL_AR: Record<ObservationPurpose, string> = {
  baseline: "خط أساس",
  progress: "تقدم",
  incident: "حادثة",
  generalization: "تعميم",
  quality_check: "فحص جودة",
  follow_up: "متابعة",
};

function getTodayRange(): { startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
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

interface SessionOption {
  session_id: string;
  scheduled_start_at: string | null;
  session_type: string;
  completion_status: SessionCompletionStatus | null;
}

async function loadTodaysSessionOptions(caseId: string): Promise<SessionOption[]> {
  const { startIso, endIso } = getTodayRange();
  const { data, error } = await supabase
    .from("session")
    .select("session_id, scheduled_start_at, session_type, completion_status")
    .eq("case_id", caseId)
    .gte("scheduled_start_at", startIso)
    .lt("scheduled_start_at", endIso)
    .order("scheduled_start_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface ActiveDefinitionOption {
  measurement_definition_id: string;
  code: string;
  label_ar: string;
  unit: string;
  numerator_label: string | null;
  denominator_label: string | null;
}

async function loadActiveDefinitions(goalId: string): Promise<ActiveDefinitionOption[]> {
  const { data, error } = await supabase
    .from("measurement_definition")
    .select("measurement_definition_id, code, label_ar, unit, numerator_label, denominator_label")
    .eq("goal_id", goalId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}


async function loadGoalOptions(
  caseId: string,
): Promise<Array<{ goal_id: string; title: string }>> {
  const { data, error } = await supabase
    .from("goal")
    .select("goal_id, title")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

function formatTime(value: string | null): string {
  if (!value) return "بدون وقت";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { timeStyle: "short" }).format(d);
}

interface QuickCapturePanelProps {
  caseId: string;
  learnerId: string;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function QuickCapturePanel({ caseId, learnerId }: QuickCapturePanelProps) {
  const queryClient = useQueryClient();
  const [narrativeText, setNarrativeText] = useState("");
  const [observationType, setObservationType] = useState<ObservationType>("narrative");
  const [purpose, setPurpose] = useState<ObservationPurpose>("progress");
  const [sessionId, setSessionId] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");

  const [includeDataPoint, setIncludeDataPoint] = useState(false);
  const [definitionId, setDefinitionId] = useState<string>("");
  const [valueNumeric, setValueNumeric] = useState<string>("");
  const [numerator, setNumerator] = useState<string>("");
  const [denominator, setDenominator] = useState<string>("");
  const [unit, setUnit] = useState<DataPointUnit>("percent");
  const [outcomeCode, setOutcomeCode] = useState<DataPointOutcomeCode>("partial");
  const [recordedAt, setRecordedAt] = useState<string>(() => toLocalInputValue(new Date()));

  const teamMemberQuery = useQuery({
    queryKey: ["current-team-member"],
    queryFn: loadCurrentTeamMemberId,
  });
  const sessionsQuery = useQuery({
    queryKey: ["quick-capture-sessions", caseId],
    queryFn: () => loadTodaysSessionOptions(caseId),
  });
  const goalsQuery = useQuery({
    queryKey: ["quick-capture-goals", caseId],
    queryFn: () => loadGoalOptions(caseId),
  });
  const definitionsQuery = useQuery({
    queryKey: ["quick-capture-active-definitions", goalId],
    queryFn: () => loadActiveDefinitions(goalId),
    enabled: goalId !== "",
  });

  const teamMemberId = teamMemberQuery.data ?? null;
  const activeDefinitions = goalId === "" ? [] : (definitionsQuery.data ?? []);
  const selectedSession =
    sessionId === ""
      ? null
      : ((sessionsQuery.data ?? []).find((s) => s.session_id === sessionId) ?? null);

  const createObservation = useMutation({
    mutationFn: async () => {
      if (!teamMemberId) throw new Error("no_team_member");
      const { data: inserted, error } = await supabase
        .from("observation")
        .insert({
          case_id: caseId,
          learner_id: learnerId,
          observer_team_member_id: teamMemberId,
          session_id: sessionId === "" ? null : sessionId,
          goal_id: goalId === "" ? null : goalId,
          observation_type: observationType,
          purpose,
          narrative_text: narrativeText.trim(),
          status: "draft",
          observed_at: new Date().toISOString(),
        })
        .select("observation_id")
        .single();
      if (error) throw error;

      const shouldRecordDataPoint =
        includeDataPoint && goalId !== "" && definitionId !== "" && activeDefinitions.length > 0;

      if (shouldRecordDataPoint) {
        const parsed = (raw: string): number | null => {
          const trimmed = raw.trim();
          if (trimmed === "") return null;
          const n = Number(trimmed);
          return Number.isFinite(n) ? n : null;
        };
        const { error: dpError } = await supabase.from("data_point").insert({
          observation_id: inserted.observation_id,
          case_id: caseId,
          learner_id: learnerId,
          goal_id: goalId,
          measurement_definition_id: definitionId,
          value_numeric: parsed(valueNumeric),
          numerator: parsed(numerator),
          denominator: parsed(denominator),
          unit,
          outcome_code: outcomeCode,
          recorded_at: new Date(recordedAt).toISOString(),
          source_mode: "manual",
          validation_status: "draft",
          recorded_by_team_member_id: teamMemberId,
        });
        if (dpError) throw dpError;
      }
    },
    onSuccess: async () => {
      setNarrativeText("");
      setSessionId("");
      setGoalId("");
      setIncludeDataPoint(false);
      setDefinitionId("");
      setValueNumeric("");
      setNumerator("");
      setDenominator("");
      setRecordedAt(toLocalInputValue(new Date()));
      await queryClient.invalidateQueries({ queryKey: ["observations", caseId] });
    },
  });


  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createObservation.mutate();
  }

  const sessions = sessionsQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-card-foreground">التقاط سريع</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        تُحفظ كل ملاحظة كمسودة، ولا تصبح جزءاً من السجل الرسمي إلا بعد مراجعة بشرية لاحقة.
      </p>

      {teamMemberQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ التحقق من عضوية الفريق…</p>
      ) : teamMemberQuery.error ? (
        <p className="text-sm text-destructive">
          تعذر التحقق من ارتباط المستخدم بعضو فريق وفق سياسات الوصول.
        </p>
      ) : !teamMemberId ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          لا يوجد عضو فريق مرتبط بحساب المستخدم الحالي. يجب ربط الحساب بعضو فريق قبل تسجيل
          الملاحظات.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="qc-narrative" className="mb-1 block text-xs text-muted-foreground">
              نص الملاحظة
            </label>
            <textarea
              id="qc-narrative"
              className={fieldClass}
              rows={3}
              required
              value={narrativeText}
              onChange={(e) => setNarrativeText(e.target.value)}
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="qc-type" className="mb-1 block text-xs text-muted-foreground">
                نوع الملاحظة
              </label>
              <select
                id="qc-type"
                className={fieldClass}
                value={observationType}
                onChange={(e) => setObservationType(e.target.value as ObservationType)}
              >
                {(Object.keys(OBSERVATION_TYPE_LABEL_AR) as ObservationType[]).map((k) => (
                  <option key={k} value={k}>
                    {OBSERVATION_TYPE_LABEL_AR[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="qc-purpose" className="mb-1 block text-xs text-muted-foreground">
                الغرض
              </label>
              <select
                id="qc-purpose"
                className={fieldClass}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value as ObservationPurpose)}
              >
                {(Object.keys(OBSERVATION_PURPOSE_LABEL_AR) as ObservationPurpose[]).map((k) => (
                  <option key={k} value={k}>
                    {OBSERVATION_PURPOSE_LABEL_AR[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="qc-session" className="mb-1 block text-xs text-muted-foreground">
                ربط بجلسة اليوم (اختياري)
              </label>
              {sessionsQuery.isPending ? (
                <p className="text-xs text-muted-foreground">جارٍ تحميل جلسات اليوم…</p>
              ) : sessionsQuery.error ? (
                <p className="text-xs text-destructive">تعذر تحميل جلسات اليوم.</p>
              ) : (
                <select
                  id="qc-session"
                  className={fieldClass}
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  <option value="">بدون ربط</option>
                  {sessions.map((s) => (
                    <option key={s.session_id} value={s.session_id}>
                      {formatTime(s.scheduled_start_at)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label htmlFor="qc-goal" className="mb-1 block text-xs text-muted-foreground">
                ربط بهدف (اختياري)
              </label>
              {goalsQuery.isPending ? (
                <p className="text-xs text-muted-foreground">جارٍ تحميل الأهداف…</p>
              ) : goalsQuery.error ? (
                <p className="text-xs text-destructive">تعذر تحميل الأهداف.</p>
              ) : (
                <select
                  id="qc-goal"
                  className={fieldClass}
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                >
                  <option value="">بدون ربط</option>
                  {goals.map((g) => (
                    <option key={g.goal_id} value={g.goal_id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={createObservation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {createObservation.isPending ? "جارٍ الحفظ…" : "حفظ كمسودة"}
            </button>
            {createObservation.isError ? (
              <span className="text-sm text-destructive">
                تعذر حفظ الملاحظة. تحقق من الصلاحيات وحاول مرة أخرى.
              </span>
            ) : null}
            {createObservation.isSuccess ? (
              <span className="text-sm text-primary">تم حفظ الملاحظة كمسودة.</span>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
