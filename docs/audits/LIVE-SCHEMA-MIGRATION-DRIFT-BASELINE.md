# HIMAM — Live Schema and Migration Authority Drift Baseline

## 1. Scope and Evidence

هذا الملف يوثّق خط أساس تدقيق مقروء فقط لحالة الانحراف بين المخطط الحي ومسارات الهجرة في مستودع HIMAM.

- Repository baseline commit: `07c9ae0d23ec5488b006cd4001f2340b1eb8274f`
- Live inspection method: SELECT-only PostgreSQL system-catalog metadata inspection performed by Lovable
- لم يتم الوصول إلى أي database rows أو secrets أو configuration values، ولم يتم تغيير أي schema changes.
- هذا الملف لا يصرّح بأي migration أو RLS أو grant أو trigger أو function أو RPC أو UI أو CI أو database change.

## 2. Confirmed Live State

الحالة التالية مؤكدة كخط أساس مقروء فقط للمخطط الحي:

- `supabase_migrations.schema_migrations` يحتوي على أربعة live Supabase migration versions:
  `20260818170741`, `20260818170755`, `20260818171641`, `20260818191606`
- لا توجد علاقة حيّة باسم `__drizzle_migrations`.
- توجد 15 relevant `public` tables:
  `case`, `case_membership`, `data_point`, `goal`, `goal_need_link`, `governance_audit_log`, `learner`, `measurement_definition`, `measurement_plan`, `need`, `observation`, `organizations`, `quality_disclosures`, `session`, `team_member`
- RLS مفعّل على كل الجداول الـ15، وforce-RLS غير مفعّل.
- المخطط الحي يتضمن hardened access/write functions تقابل Drizzle `0009` through `0013`.

## 3. Drift Findings

الانحرافات التالية موثّقة كوقائع تحتاج قرار مصالحة، وليست تفويضًا لأي تعديل:

- Drizzle journal ينتهي عند `0005`، بينما repository SQL يستمر حتى `0013`.
- قاعدة البيانات الحية تحتوي على objects تقابل Drizzle `0007` through `0013`، دون وجود live Drizzle migration journal.
- `enforce_goal_approval_gates()` موجودة، لكن لا يوجد trigger باسم `goal_approval_gates` على `goal`.
- session/observation direct write policies المتوقعة من timestamped Supabase migration غير موجودة في المخطط الحي، بينما hardened write RPCs موجودة.
- لم يمكن التحقق من per-role grants للأدوار `anon`, `authenticated`, و`service_role` داخل metadata session.
- بعض SECURITY DEFINER helpers لديها PUBLIC EXECUTE؛ هذا بند مراجعة لاحقة، وليس استنتاجًا بوجود vulnerability.

## 4. Decision

القرار المعتمد لهذا الخط الأساسي:

- Migration authority status: reconciliation required before migration authority can be assigned.
- لا يجب اعتبار `drizzle/` أو `supabase/migrations/` مصدرًا authoritative مستقلًا.
- لا يجوز apply أو consolidate أو rename أو regenerate أو delete لأي migration قبل وجود approved reconciliation plan.
- لا يصرّح هذا المستند بأي migration أو RLS أو grant أو trigger أو function أو RPC أو UI أو CI أو database change.

## 5. Immediate Safety Controls

تسري ضوابط السلامة التالية فورًا على أي عمل لاحق مرتبط بهذا الانحراف:

- لا database migration أو schema change.
- لا RLS أو grant أو trigger أو function أو RPC أو UI أو CI remediation.
- لا `db:push` أو `db:migrate` أو Supabase migration apply أو manual DDL.
- لا Git history rewrite.
- يجب إبقاء التغييرات المستقبلية منفصلة في focused commits.

## 6. Open Decision Gates

هذه بوابات قرار مفتوحة، ولا تُعد محسومة بهذا الملف:

- تحديد ما إذا كان غياب trigger باسم `goal_approval_gates` مقصودًا، وما إذا كانت hardened goal RPCs تفرض equivalent state rules بالكامل.
- تحديد ما إذا كانت إزالة session/observation direct write policies مقصودة لأن hardened RPCs هي exclusive intended write path.
- الحصول على least-privileged grant/ACL metadata review للأدوار `anon`, `authenticated`, و`service_role`.
- إنشاء approved mapping من live migration history إلى Drizzle and Supabase repository files.
- اختيار authoritative future migration workflow واحد فقط بعد اعتماد mapping وdrift decisions.

## 7. Next Read-Only Tasks

المهام التالية مقروءة فقط، ولا تتضمن أي تعديل على قاعدة البيانات أو المستودع:

- Read-only review لأجسام `finalize_goal_for_review_hardened()` و`approve_goal_hardened()` بواسطة Lovable، مع تلخيص دون secrets.
- Read-only review لأجسام functions/policies المتعلقة بـ`goal_need_link` للتحقق من case وlearner وduplicate وapproval وaudit assertions.
- Least-privileged ACL/grant inventory للجداول المحكومة وpublic functions.
- Repository-only mapping plan بين Drizzle SQL وDrizzle journal وSupabase applied migration versions.

## 8. Out of Scope

العناصر التالية خارج نطاق هذا الملف وخارج نطاق هذا التوثيق:

- Any application implementation
- Any database mutation
- Migration reconciliation implementation
- RLS/RPC/grant/trigger changes
- UI changes
- CI changes
- AI governance or product behavior changes
