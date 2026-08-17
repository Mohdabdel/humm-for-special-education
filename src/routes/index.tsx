import { createFileRoute } from "@tanstack/react-router";
import {
  CASE_STATUS_LABEL_AR,
  DEMO_ACTIVE_GOALS,
  DEMO_ALERTS,
  DEMO_CASE_SNAPSHOT,
  DEMO_PRIORITIES,
  DEMO_TIMELINE,
  PRIORITY_LABEL_AR,
} from "@/lib/case-workspace/demo-data";
import type { CasePriorityLevel, CaseStatus } from "@/lib/db/schema/case_mgmt/schema";

export const Route = createFileRoute("/")({
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

function statusClasses(status: CaseStatus): string {
  if (status === "active") return "bg-primary/10 text-primary";
  if (status === "review_due") return "bg-destructive/10 text-destructive";
  return "bg-muted text-muted-foreground";
}

function priorityClasses(level: CasePriorityLevel): string {
  if (level === "high") return "bg-destructive/10 text-destructive";
  if (level === "medium") return "bg-accent text-accent-foreground";
  return "bg-muted text-muted-foreground";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-card-foreground">{title}</h2>
      {children}
    </section>
  );
}

function CaseWorkspacePage() {
  const c = DEMO_CASE_SNAPSHOT;

  return (
    <main className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* بيانات تجريبية (Scaffold) — ليست سجلات حقيقية */}
        <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          بيانات عرض تجريبية للهيكل فقط (Scaffold) — لا تمثل سجلات حقيقية ولا تُحفظ في قاعدة
          البيانات.
        </p>

        <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">مساحة عمل الحالة · {c.caseNumber}</p>
              <h1 className="mt-1 text-2xl font-bold text-card-foreground">{c.titleAr}</h1>
              <p className="mt-1 text-sm text-muted-foreground">المتعلم: {c.learnerNameAr}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusClasses(c.status)}`}
            >
              {CASE_STATUS_LABEL_AR[c.status]}
            </span>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">مسؤول الحالة</dt>
              <dd className="mt-1 font-medium text-card-foreground">{c.caseManagerAr}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">تاريخ الفتح</dt>
              <dd className="mt-1 font-medium text-card-foreground">{c.openedAtAr}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">المراجعة المستحقة</dt>
              <dd className="mt-1 font-medium text-card-foreground">{c.reviewDueAtAr}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">آخر نشاط</dt>
              <dd className="mt-1 font-medium text-card-foreground">
                {c.lastActivityAr} · {c.lastActivityAtAr}
              </dd>
            </div>
          </dl>
        </header>

        <Section title="تنبيهات أساسية">
          <ul className="space-y-2">
            {DEMO_ALERTS.map((a) => (
              <li
                key={a.id}
                className={`rounded-md px-3 py-2 text-sm ${
                  a.severity === "warning"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {a.messageAr}
              </li>
            ))}
          </ul>
        </Section>

        <div className="grid gap-6 md:grid-cols-2">
          <Section title="الأولويات الحالية">
            <ul className="space-y-3">
              {DEMO_PRIORITIES.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{p.titleAr}</p>
                    <p className="text-xs text-muted-foreground">{p.sourceAr}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${priorityClasses(p.level)}`}
                  >
                    {PRIORITY_LABEL_AR[p.level]}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="ملخص الأهداف النشطة">
            <ul className="space-y-3">
              {DEMO_ACTIVE_GOALS.map((g) => (
                <li key={g.id} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-card-foreground">{g.titleAr}</p>
                    <p className="text-xs text-muted-foreground">{g.domainAr}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {g.statusAr}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              عرض للقراءة فقط. أي اعتماد أو إغلاق للهدف يتم عبر بوابة اعتماد بشرية خارج هذه الشاشة.
            </p>
          </Section>
        </div>

        <Section title="الخط الزمني المختصر">
          <ol className="space-y-3 border-r border-border pr-4">
            {DEMO_TIMELINE.map((t) => (
              <li key={t.id} className="relative">
                <span className="absolute -right-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <p className="text-sm font-medium text-card-foreground">{t.titleAr}</p>
                <p className="text-xs text-muted-foreground">
                  {t.dateAr} · {t.byAr}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </main>
  );
}
