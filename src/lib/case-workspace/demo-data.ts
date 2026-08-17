// SCAFFOLD / DEMO DATA ONLY — not production records, not persisted anywhere.
// Used solely to render the Phase 1 Case Workspace UI skeleton.
// Replace with real, RLS-protected reads in a later step.

import type { CasePriorityLevel, CaseStatus } from "@/lib/db/schema/case_mgmt/schema";

export interface DemoCaseSnapshot {
  caseNumber: string;
  learnerNameAr: string;
  titleAr: string;
  status: CaseStatus;
  caseManagerAr: string;
  openedAtAr: string;
  reviewDueAtAr: string;
  lastActivityAr: string;
  lastActivityAtAr: string;
}

export interface DemoPriority {
  id: string;
  titleAr: string;
  level: CasePriorityLevel;
  sourceAr: string;
}

export interface DemoActiveGoal {
  id: string;
  titleAr: string;
  domainAr: string;
  statusAr: string;
}

export interface DemoTimelineEntry {
  id: string;
  dateAr: string;
  titleAr: string;
  byAr: string;
}

export interface DemoAlert {
  id: string;
  messageAr: string;
  severity: "warning" | "info";
}

export const DEMO_CASE_SNAPSHOT: DemoCaseSnapshot = {
  caseNumber: "C-1042",
  learnerNameAr: "سارة عبدالله",
  titleAr: "خطة دعم المهارات التواصلية",
  status: "review_due",
  caseManagerAr: "أ. منى الحربي",
  openedAtAr: "١٢ يناير ٢٠٢٦",
  reviewDueAtAr: "٢٥ أغسطس ٢٠٢٦",
  lastActivityAr: "تحديث ملاحظة جلسة",
  lastActivityAtAr: "قبل ٣ ساعات",
};

export const DEMO_PRIORITIES: readonly DemoPriority[] = [
  { id: "p1", titleAr: "تعزيز طلب الحاجات لفظيًا", level: "high", sourceAr: "مصدر: تقييم لغوي" },
  { id: "p2", titleAr: "تقليل سلوك مغادرة المقعد", level: "high", sourceAr: "مصدر: ملاحظة صفية" },
  { id: "p3", titleAr: "الاستقلالية في روتين الصباح", level: "medium", sourceAr: "مصدر: تقرير الأسرة" },
  { id: "p4", titleAr: "التآزر البصري الحركي", level: "medium", sourceAr: "مصدر: تقييم وظيفي" },
  { id: "p5", titleAr: "المشاركة في النشاط الجماعي", level: "low", sourceAr: "مصدر: ملاحظة صفية" },
];

export const DEMO_ACTIVE_GOALS: readonly DemoActiveGoal[] = [
  { id: "g1", titleAr: "تستخدم جملة طلب من كلمتين", domainAr: "التواصل", statusAr: "قيد التنفيذ" },
  { id: "g2", titleAr: "تبقى في المقعد ١٠ دقائق", domainAr: "السلوك", statusAr: "قيد التنفيذ" },
  { id: "g3", titleAr: "ترتب أدواتها بعد النشاط", domainAr: "الاستقلالية", statusAr: "قيد المراجعة" },
];

export const DEMO_TIMELINE: readonly DemoTimelineEntry[] = [
  { id: "t1", dateAr: "١٧ أغسطس", titleAr: "تسجيل ملاحظة جلسة", byAr: "أ. منى الحربي" },
  { id: "t2", dateAr: "١٤ أغسطس", titleAr: "اعتماد هدف تواصلي", byAr: "د. فهد العتيبي" },
  { id: "t3", dateAr: "٠٩ أغسطس", titleAr: "إضافة تقييم لغوي", byAr: "أ. ريم القحطاني" },
  { id: "t4", dateAr: "٠١ أغسطس", titleAr: "فتح الحالة", byAr: "أ. منى الحربي" },
];

export const DEMO_ALERTS: readonly DemoAlert[] = [
  { id: "a1", messageAr: "موعد المراجعة الدورية خلال ٨ أيام.", severity: "warning" },
  { id: "a2", messageAr: "هدف واحد بانتظار اعتماد بشري.", severity: "warning" },
  { id: "a3", messageAr: "لا توجد بيانات قياس مسجلة هذا الأسبوع.", severity: "info" },
];

export const CASE_STATUS_LABEL_AR: Record<CaseStatus, string> = {
  active: "نشطة",
  review_due: "مراجعة مستحقة",
  closed: "مغلقة",
};

export const PRIORITY_LABEL_AR: Record<CasePriorityLevel, string> = {
  high: "عالية",
  medium: "متوسطة",
  low: "منخفضة",
};
