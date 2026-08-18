import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SessionRow = Database["public"]["Tables"]["session"]["Row"];
type SessionType = Database["public"]["Enums"]["session_type"];
type SessionStatus = Database["public"]["Enums"]["session_status"];

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

function getTodayRange(): { startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function loadTodaysSessions(caseId: string): Promise<SessionRow[]> {
  const { startIso, endIso } = getTodayRange();
  const { data, error } = await supabase
    .from("session")
    .select("*")
    .eq("case_id", caseId)
    .gte("scheduled_start_at", startIso)
    .lt("scheduled_start_at", endIso)
    .order("scheduled_start_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

interface TodaysSessionsSectionProps {
  caseId: string;
}

export function TodaysSessionsSection({ caseId }: TodaysSessionsSectionProps) {
  const { data, isPending, error } = useQuery({
    queryKey: ["todays-sessions", caseId],
    queryFn: () => loadTodaysSessions(caseId),
  });

  const sessions = data ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">جلسات اليوم</h2>

      {isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ تحميل جلسات اليوم…</p>
      ) : error ? (
        <p className="text-sm text-destructive">تعذر تحميل الجلسات وفق سياسات الوصول.</p>
      ) : sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">لا توجد جلسات مجدولة لهذا اليوم.</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.session_id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm font-medium text-card-foreground">
                {SESSION_TYPE_LABEL_AR[s.session_type]}
              </span>
              <span className="text-sm text-muted-foreground">{formatTime(s.scheduled_start_at)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClasses(s.status)}`}
              >
                {SESSION_STATUS_LABEL_AR[s.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
