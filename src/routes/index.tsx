import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CaseRow = Database["public"]["Tables"]["case"]["Row"];
type CaseStatus = Database["public"]["Enums"]["case_status"];
type CaseRiskLevel = Database["public"]["Enums"]["case_risk_level"];

type WorkspaceData =
  | { kind: "unauthenticated" }
  | { kind: "empty" }
  | { kind: "ready"; row: CaseRow };

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { case_id?: string } =>
    typeof search["case_id"] === "string" ? { case_id: search["case_id"] } : {},
  head: () => ({
    meta: [
      { title: "مساحة عمل الحالة | منصة همم" },
      {
        name: "description",
        content:
          "مساحة عمل الحالة في منصة همم: لقطة الحالة، الأولويات، الأهداف النشطة، الخط الزمني والتنبيهات.",
      },
      { property: "og:title", content: "مساحة عمل الحالة | منصة همم" },
      {
        property: "og:description",
        content: "الوحدة التشغيلية الأولى في منصة همم للتربية الخاصة: مساحة عمل الحالة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseWorkspacePage,
});

const CASE_STATUS_LABEL_AR: Record<CaseStatus, string> = {
  active: "نشطة",
  review_due: "مراجعة مستحقة",
  closed: "مغلقة",
};

const RISK_LABEL_AR: Record<CaseRiskLevel, string> = {
  none: "لا يوجد خطر",
  watch: "تحت الملاحظة",
  needs_attention: "تحتاج انتباه",
  urgent: "عاجلة",
};

function statusClasses(status: CaseStatus): string {
  if (status === "active") return "bg-primary/10 text-primary";
  if (status === "review_due") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function riskClasses(risk: CaseRiskLevel): string {
  if (risk === "urgent") return "bg-destructive text-destructive-foreground";
  if (risk === "needs_attention") return "bg-destructive/10 text-destructive";
  if (risk === "watch") return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function formatAr(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function derivePriorities(summary: string | null): string[] {
  if (!summary) return [];
  return summary
    .split(/\r?\n|[•·]|(?<=\S)\s*[-–]\s+|[.؟!،؛]/g)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 5);
}

async function loadWorkspace(caseId: string | undefined): Promise<WorkspaceData> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { kind: "unauthenticated" };

  let query = supabase.from("case").select("*");
  if (caseId) query = query.eq("case_id", caseId);
  const { data, error } = await query.order("last_activity_at", { ascending: false }).limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return { kind: "empty" };
  return { kind: "ready", row };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">{children}</div>
    </main>
  );
}

function CaseWorkspacePage() {
  const search = Route.useSearch();
  const caseId = search.case_id;

  const { data, isPending, error } = useQuery({
    queryKey: ["case-workspace", caseId ?? "first"],
    queryFn: () => loadWorkspace(caseId),
  });

  if (isPending) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">جارٍ تحميل بيانات الحالة…</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <h1 className="text-lg font-semibold text-destructive">تعذر تحميل الحالة</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            قد يكون السبب سياسات الوصول (RLS) أو عدم وجود صلاحية على هذه الحالة.
          </p>
        </div>
      </Shell>
    );
  }

  if (data.kind === "unauthenticated") {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-card-foreground">يلزم تسجيل الدخول</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            لا توجد جلسة مستخدم حالية. بيانات الحالات محمية بسياسات صفوف (RLS) ولا يمكن عرضها دون
            مستخدم مسجّل الدخول.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            تسجيل الدخول غير مُنفَّذ بعد ضمن نطاق هذه المرحلة.
          </p>
        </div>
      </Shell>
    );
  }

  if (data.kind === "empty") {
    return (
      <Shell>
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-card-foreground">لا توجد حالات متاحة</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            لا توجد حالة يمكن للمستخدم الحالي الوصول إليها وفق سياسات الوصول.
          </p>
        </div>
      </Shell>
    );
  }

  const c = data.row;
  const priorities = derivePriorities(c.current_priority_summary);
  const alerts: string[] = [];
  if (c.status === "review_due") alerts.push("المراجعة مستحقة لهذه الحالة.");
  if (c.risk_level !== "none")
    alerts.push(`مستوى الخطر الحالي: ${RISK_LABEL_AR[c.risk_level]} — يتطلب متابعة.`);

  const timeline = [
    { id: "last_activity", titleAr: "آخر نشاط مسجَّل على الحالة", at: c.last_activity_at },
    { id: "updated", titleAr: "آخر تحديث لسجل الحالة", at: c.updated_at },
    { id: "status", titleAr: `الحالة الحالية: ${CASE_STATUS_LABEL_AR[c.status]}`, at: c.updated_at },
  ].slice(0, 3);

  return (
    <Shell>
      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
        {caseId
          ? "عرض الحالة المحددة."
          : "عرض مؤقت لأول حالة متاحة — سيتم استبداله بقائمة الحالات في الخطوة التالية."}
      </p>

      <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">مساحة عمل الحالة · {c.case_number}</p>
            <h1 className="mt-1 text-2xl font-bold text-card-foreground">
              المتعلم: معرّف المتعلم {c.learner_id}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              (اسم المتعلم غير متاح حالياً — يُعرض المعرّف كبديل لعدم توسيع صلاحيات الوصول)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(c.status)}`}
            >
              {CASE_STATUS_LABEL_AR[c.status]}
            </span>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${riskClasses(c.risk_level)}`}
            >
              {RISK_LABEL_AR[c.risk_level]}
            </span>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <dt className="text-muted-foreground">تاريخ البدء</dt>
            <dd className="mt-1 font-medium text-card-foreground">{c.start_date ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">المراجعة المستهدفة</dt>
            <dd className="mt-1 font-medium text-card-foreground">{c.target_review_date ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">آخر نشاط</dt>
            <dd className="mt-1 font-medium text-card-foreground">{formatAr(c.last_activity_at)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">آخر تحديث</dt>
            <dd className="mt-1 font-medium text-card-foreground">{formatAr(c.updated_at)}</dd>
          </div>
        </dl>
      </header>

      <Section title="تنبيهات أساسية">
        {alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد تنبيهات حالياً.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a} className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {a}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-6 md:grid-cols-2">
        <Section title="الأولويات الحالية">
          {priorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا يوجد ملخص أولويات مسجَّل للحالة.</p>
          ) : (
            <ul className="list-inside list-disc space-y-2">
              {priorities.map((p) => (
                <li key={p} className="text-sm text-card-foreground">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="ملخص الأهداف النشطة">
          <p className="text-sm font-medium text-card-foreground">0 هدف نشط</p>
          <p className="mt-2 text-xs text-muted-foreground">
            لا يوجد جدول أهداف بعد. أي اعتماد أو إغلاق للهدف يتم لاحقاً عبر بوابة اعتماد بشرية.
          </p>
        </Section>
      </div>

      <Section title="الخط الزمني المختصر">
        <ol className="space-y-3 border-r border-border pr-4">
          {timeline.map((t) => (
            <li key={t.id} className="relative">
              <span className="absolute -right-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <p className="text-sm font-medium text-card-foreground">{t.titleAr}</p>
              <p className="text-xs text-muted-foreground">{formatAr(t.at)}</p>
            </li>
          ))}
        </ol>
      </Section>
    </Shell>
  );
}
