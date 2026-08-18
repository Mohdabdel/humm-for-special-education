import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SessionRow = Database["public"]["Tables"]["session"]["Row"];
type SessionType = Database["public"]["Enums"]["session_type"];
type SessionStatus = Database["public"]["Enums"]["session_status"];
type SessionCompletionStatus = Database["public"]["Enums"]["session_completion_status"];

const SESSION_TYPE_LABEL_AR: Record<SessionType, string> = {
  special_education: "تربية خاصة",
  therapy: "علاج",
  behavior_support: "دعم سلوكي",
  vocational_training: "تدريب مهني",
  functional_activity: "نشاط وظيفي",
  classroom_support: "دعم صفي",
  community_based: "مجتمعي",
  family_coaching: "تدريب أُسري",
  meeting: "اجتماع",
};

const SESSION_STATUS_LABEL_AR: Record<SessionStatus, string> = {
  scheduled: "مجدولة",
  in_progress: "قيد التنفيذ",
  completed: "مكتملة",
  missed: "فائتة",
  cancelled: "ملغاة",
  documented: "موثَّقة",
};

const COMPLETION_STATUS_LABEL_AR: Record<SessionCompletionStatus, string> = {
  complete: "مكتمل",
  partial: "جزئي",
  not_completed: "لم يُكتمل",
};

function statusClasses(status: SessionStatus): string {
  if (status === "completed" || status === "documented") return "bg-primary/10 text-primary";
  if (status === "in_progress") return "bg-accent text-accent-foreground";
  if (status === "missed" || status === "cancelled") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function formatTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { timeStyle: "short" }).format(d);
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

async function loadSession(sessionId: string): Promise<SessionRow | null> {
  const { data, error } = await supabase.from("session").select("*").eq("session_id", sessionId).single();
  if (error) throw error;
  return data ?? null;
}

async function loadGoalTitle(goalId: string | null): Promise<string | null> {
  if (!goalId) return null;
  const { data, error } = await supabase.from("goal").select("title").eq("goal_id", goalId).single();
  if (error) throw error;
  return data?.title ?? null;
}

async function startSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("session")
    .update({ status: "in_progress", actual_start_at: new Date().toISOString() })
    .eq("session_id", sessionId);
  if (error) throw error;
}

async function completeSession(sessionId: string): Promise<void> {
  const { error } = await supabase
    .from("session")
    .update({
      status: "completed",
      actual_end_at: new Date().toISOString(),
      completion_status: "complete",
    })
    .eq("session_id", sessionId);
  if (error) throw error;
}

interface SessionCardProps {
  sessionId: string | null;
  caseId: string;
}

export function SessionCard({ sessionId, caseId }: SessionCardProps) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ["session-card", sessionId],
    queryFn: () => loadSession(sessionId!),
    enabled: !!sessionId,
  });

  const goalQuery = useQuery({
    queryKey: ["session-goal", sessionQuery.data?.goal_id],
    queryFn: () => loadGoalTitle(sessionQuery.data?.goal_id ?? null),
    enabled: !!sessionQuery.data?.goal_id,
  });

  const startMutation = useMutation({
    mutationFn: startSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-card", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["todays-sessions", caseId] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: completeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-card", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["todays-sessions", caseId] });
    },
  });

  if (!sessionId) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-card-foreground">بطاقة الجلسة</h2>
        <p className="text-sm text-muted-foreground">اختر جلسة من القائمة لعرض تفاصيلها.</p>
      </section>
    );
  }

  if (sessionQuery.isPending) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-card-foreground">بطاقة الجلسة</h2>
        <p className="text-sm text-muted-foreground">جارٍ تحميل تفاصيل الجلسة…</p>
      </section>
    );
  }

  if (sessionQuery.error || !sessionQuery.data) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="mb-2 text-base font-semibold text-card-foreground">بطاقة الجلسة</h2>
        <p className="text-sm text-destructive">تعذر تحميل الجلسة أو الوصول إليها.</p>
      </section>
    );
  }

  const s = sessionQuery.data;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">بطاقة الجلسة</h2>
          <p className="text-xs text-muted-foreground">{SESSION_TYPE_LABEL_AR[s.session_type]}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(s.status)}`}
        >
          {SESSION_STATUS_LABEL_AR[s.status]}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">البدء المجدول</dt>
          <dd className="mt-1 font-medium text-card-foreground">{formatDateTime(s.scheduled_start_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">الانتهاء المجدول</dt>
          <dd className="mt-1 font-medium text-card-foreground">{formatDateTime(s.scheduled_end_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">البدء الفعلي</dt>
          <dd className="mt-1 font-medium text-card-foreground">{formatDateTime(s.actual_start_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">الانتهاء الفعلي</dt>
          <dd className="mt-1 font-medium text-card-foreground">{formatDateTime(s.actual_end_at)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">حالة الإكمال</dt>
          <dd className="mt-1 font-medium text-card-foreground">
            {s.completion_status ? COMPLETION_STATUS_LABEL_AR[s.completion_status] : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">الهدف المرتبط</dt>
          <dd className="mt-1 font-medium text-card-foreground">
            {goalQuery.isPending ? (
              <span className="text-muted-foreground">جارٍ التحميل…</span>
            ) : goalQuery.error ? (
              <span className="text-destructive">تعذر تحميل الهدف.</span>
            ) : goalQuery.data ? (
              goalQuery.data
            ) : (
              <span className="text-muted-foreground">لا يوجد هدف مرتبط.</span>
            )}
          </dd>
        </div>
      </dl>

      {s.brief_note && (
        <div className="mt-4 rounded-md bg-muted/50 p-3">
          <dt className="text-xs text-muted-foreground">ملاحظة مختصرة</dt>
          <dd className="mt-1 text-sm text-card-foreground">{s.brief_note}</dd>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {s.status === "scheduled" && (
          <button
            type="button"
            disabled={startMutation.isPending}
            onClick={() => startMutation.mutate(s.session_id)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {startMutation.isPending ? "جارٍ البدء…" : "بدء الجلسة"}
          </button>
        )}

        {s.status === "in_progress" && (
          <button
            type="button"
            disabled={completeMutation.isPending}
            onClick={() => completeMutation.mutate(s.session_id)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {completeMutation.isPending ? "جارٍ الإكمال…" : "إكمال الجلسة"}
          </button>
        )}

        {(startMutation.error || completeMutation.error) && (
          <p className="text-sm text-destructive">تعذر تحديث حالة الجلسة. تأكد من صلاحيات الوصول.</p>
        )}
      </div>
    </section>
  );
}
