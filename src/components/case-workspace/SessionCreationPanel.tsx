import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type SessionType = Database["public"]["Enums"]["session_type"];

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

function toLocalDatetimeInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface SessionCreationPanelProps {
  caseId: string;
  learnerId: string;
}

const fieldClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground";

export function SessionCreationPanel({ caseId, learnerId }: SessionCreationPanelProps) {
  const queryClient = useQueryClient();
  const [sessionType, setSessionType] = useState<SessionType>("special_education");
  const [scheduledStartAt, setScheduledStartAt] = useState<string>(
    toLocalDatetimeInput(new Date().toISOString()),
  );
  const [goalId, setGoalId] = useState<string>("");

  const teamMemberQuery = useQuery({
    queryKey: ["current-team-member"],
    queryFn: loadCurrentTeamMemberId,
  });
  const goalsQuery = useQuery({
    queryKey: ["session-creation-goals", caseId],
    queryFn: () => loadGoalOptions(caseId),
  });

  const teamMemberId = teamMemberQuery.data ?? null;

  const createSession = useMutation({
    mutationFn: async () => {
      if (!teamMemberId) throw new Error("no_team_member");
      const { error } = await supabase.from("session").insert({
        case_id: caseId,
        learner_id: learnerId,
        delivered_by_team_member_id: teamMemberId,
        session_type: sessionType,
        scheduled_start_at: scheduledStartAt ? new Date(scheduledStartAt).toISOString() : null,
        goal_id: goalId === "" ? null : goalId,
        status: "scheduled",
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setSessionType("special_education");
      setScheduledStartAt(toLocalDatetimeInput(new Date().toISOString()));
      setGoalId("");
      await queryClient.invalidateQueries({ queryKey: ["todays-sessions", caseId] });
    },
  });

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createSession.mutate();
  }

  const goals = goalsQuery.data ?? [];

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-1 text-base font-semibold text-card-foreground">إنشاء جلسة جديدة</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        جدولة جلسة مرتبطة بالحالة. تبدأ حالتها بـ "مجدولة" ويُمكن متابعتها لاحقاً من بطاقة الجلسة.
      </p>

      {teamMemberQuery.isPending ? (
        <p className="text-sm text-muted-foreground">جارٍ التحقق من عضوية الفريق…</p>
      ) : teamMemberQuery.error ? (
        <p className="text-sm text-destructive">
          تعذر التحقق من ارتباط المستخدم بعضو فريق وفق سياسات الوصول.
        </p>
      ) : !teamMemberId ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          لا يوجد عضو فريق مرتبط بحساب المستخدم الحالي. يجب ربط الحساب بعضو فريق قبل إنشاء الجلسات.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="session-type" className="mb-1 block text-xs text-muted-foreground">
                نوع الجلسة
              </label>
              <select
                id="session-type"
                className={fieldClass}
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value as SessionType)}
              >
                {(Object.keys(SESSION_TYPE_LABEL_AR) as SessionType[]).map((k) => (
                  <option key={k} value={k}>
                    {SESSION_TYPE_LABEL_AR[k]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="session-time" className="mb-1 block text-xs text-muted-foreground">
                موعد الجلسة المجدول
              </label>
              <input
                id="session-time"
                type="datetime-local"
                className={fieldClass}
                required
                value={scheduledStartAt}
                onChange={(e) => setScheduledStartAt(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="session-goal" className="mb-1 block text-xs text-muted-foreground">
              ربط بهدف (اختياري)
            </label>
            {goalsQuery.isPending ? (
              <p className="text-xs text-muted-foreground">جارٍ تحميل الأهداف…</p>
            ) : goalsQuery.error ? (
              <p className="text-xs text-destructive">تعذر تحميل الأهداف.</p>
            ) : (
              <select
                id="session-goal"
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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={createSession.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {createSession.isPending ? "جارٍ الحفظ…" : "حفظ الجلسة"}
            </button>
            {createSession.isError ? (
              <span className="text-sm text-destructive">
                تعذر إنشاء الجلسة. تحقق من الصلاحيات وحاول مرة أخرى.
              </span>
            ) : null}
            {createSession.isSuccess ? (
              <span className="text-sm text-primary">تم إنشاء الجلسة بنجاح.</span>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
