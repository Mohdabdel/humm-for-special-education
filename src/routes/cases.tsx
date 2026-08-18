import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LogoutButton } from "@/components/LogoutButton";
import type { Database } from "@/integrations/supabase/types";

type CaseRow = Database["public"]["Tables"]["case"]["Row"];
type CaseStatus = Database["public"]["Enums"]["case_status"];
type CaseRiskLevel = Database["public"]["Enums"]["case_risk_level"];

type CaseListData = { kind: "unauthenticated" } | { kind: "ready"; rows: CaseRow[] };

export const Route = createFileRoute("/cases")({
  head: () => ({
    meta: [
      { title: "قائمة الحالات | منصة همم" },
      {
        name: "description",
        content: "قائمة الحالات المتاحة للمستخدم الحالي في منصة همم مع الحالة ومستوى الخطر.",
      },
      { property: "og:title", content: "قائمة الحالات | منصة همم" },
      {
        property: "og:description",
        content: "نقطة الدخول إلى مساحات عمل الحالات في منصة همم للتربية الخاصة.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaseListPage,
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

async function loadCaseList(): Promise<CaseListData> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { kind: "unauthenticated" };

  // RLS: the user only sees their own membership rows.
  const { data: memberships, error: membershipError } = await supabase
    .from("case_membership")
    .select("case_id")
    .is("ended_at", null);
  if (membershipError) throw membershipError;

  const caseIds = Array.from(new Set((memberships ?? []).map((m) => m.case_id)));
  if (caseIds.length === 0) return { kind: "ready", rows: [] };

  const { data: rows, error: caseError } = await supabase
    .from("case")
    .select("*")
    .in("case_id", caseIds)
    .order("last_activity_at", { ascending: false });
  if (caseError) throw caseError;

  return { kind: "ready", rows: rows ?? [] };
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main dir="rtl" className="min-h-screen bg-background px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">{children}</div>
    </main>
  );
}

function CaseListPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ["case-list"],
    queryFn: loadCaseList,
  });

  if (isPending) {
    return (
      <Shell>
        <p className="text-sm text-muted-foreground">جارٍ تحميل قائمة الحالات…</p>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
          <h1 className="text-lg font-semibold text-destructive">تعذر تحميل قائمة الحالات</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            قد يكون السبب سياسات الوصول (RLS) أو عدم وجود صلاحية على أي حالة.
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
            لا توجد جلسة مستخدم حالية. قائمة الحالات محمية بسياسات صفوف (RLS) ولا يمكن عرضها دون
            مستخدم مسجّل الدخول.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              الانتقال إلى تسجيل الدخول
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <header className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-card-foreground">قائمة الحالات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          الحالات المتاحة لك عبر عضويتك في فرق الحالات ({data.rows.length}).
        </p>
      </header>

      {data.rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-card-foreground">لا توجد حالات متاحة</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            لا توجد عضوية حالات للمستخدم الحالي وفق سياسات الوصول.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.rows.map((c) => (
            <li key={c.case_id}>
              <Link
                to="/"
                search={{ case_id: c.case_id }}
                className="block rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:bg-accent/40"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      حالة رقم {c.case_number}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      معرّف المتعلم: {c.learner_id}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses(c.status)}`}
                    >
                      {CASE_STATUS_LABEL_AR[c.status]}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${riskClasses(c.risk_level)}`}
                    >
                      {RISK_LABEL_AR[c.risk_level]}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}
