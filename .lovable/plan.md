# نتائج الفحص (قراءة فقط) — سبب خطأ الصلاحيات في مساحة عمل الحالة

## 1. المتصفح لا يمرّ عبر `auth-attacher` / `auth-middleware` أصلاً

- `src/integrations/supabase/auth-attacher.ts` يضيف `Authorization: Bearer <access_token>` **فقط** لاستدعاءات `createServerFn` (RPC للخادم)، عبر `functionMiddleware` في `src/start.ts`.
- `src/integrations/supabase/auth-middleware.ts` (`requireSupabaseAuth`) يعمل **على الخادم فقط** داخل server functions.
- المشروع لا يستخدم أي server function للبيانات: كل الاستعلامات تتم مباشرة من المتصفح عبر `supabase` client. لذلك هذان الملفان غير مؤثرين في المشكلة الحالية (ولا يوجد خلل فيهما).

## 2. `src/routes/login.tsx`

- يستورد نفس العميل: `import { supabase } from "@/integrations/supabase/client"`.
- يستدعي `await supabase.auth.signInWithPassword(...)` ثم `await navigate({ to: "/", replace: true })`. لا يوجد سباق زمني فعلي: الجلسة تُكتب في `localStorage` قبل رجوع الوعد. لا مشكلة هنا.

## 3. عميل واحد فقط في كل شاشات الحالة

كل الملفات تستورد نفس النسخة المصادَّقة:
`src/routes/index.tsx`, `src/routes/cases.tsx`, `NeedsSection`, `GoalsSection`, `SessionCard`, `TodaysSessionsSection`, `QuickCapturePanel`, `SessionCreationPanel`, `MeasurementPlanPanel` → جميعها `from "@/integrations/supabase/client"`. لا يوجد عميل بديل أو غير مصادَّق.

## 4. فحص المتصفح غير ممكن

`LOVABLE_BROWSER_AUTH_STATUS = signed_out` ولا توجد كلمة مرور، لذلك لا يمكنني تنفيذ `getSession()` / `getUser()` فعليًا في المعاينة. النتائج أعلاه وأدناه من الكود وقاعدة البيانات فقط.

## 5. السبب الجذري المؤكَّد: لا توجد `GRANT` على أي جدول في `public`

استعلام قراءة فقط:

```sql
select table_name, grantee, string_agg(privilege_type,',')
from information_schema.role_table_grants
where table_schema='public' and grantee in ('anon','authenticated','service_role')
group by 1,2;
-- (0 rows)
```

لا يملك `authenticated` ولا `anon` ولا `service_role` أي صلاحية على `case`, `case_membership`, `learner`, `team_member`, `need`, `goal`, `measurement_plan`, `session`, `observation`. لذلك PostgREST يرفض الطلب بخطأ صلاحيات **قبل** تقييم RLS، وهذا يفسّر نجاح `has_case_access()` عند المحاكاة داخل الخادم وفشل الواجهة.

## الإصلاح المقترح (عند الموافقة فقط)

هجرة SQL واحدة `drizzle/0006_grants_public_tables.sql`:

- `GRANT SELECT, INSERT, UPDATE, DELETE` إلى `authenticated` على الجداول التي تكتب فيها الواجهة: `case`, `case_membership`, `need`, `goal`, `goal_need_link`, `measurement_plan`, `session`, `observation`.
- `GRANT SELECT` فقط إلى `authenticated` على `learner`, `team_member`.
- `GRANT ALL` إلى `service_role` على جميع الجداول.
- بدون أي `GRANT` إلى `anon` (كل السياسات مقيّدة بـ `auth.uid()`).
- لا تغيير في RLS ولا في السياسات ولا في الكود.

ثم تطبيق الهجرة والتحقق بإعادة قراءة `information_schema.role_table_grants`.
