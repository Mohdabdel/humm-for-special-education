# خطة معالجة الأمن والحوكمة

## 1. بيانات المهمة

- Task ID: HIMAM-CODEX-01A-R
- Repository: Mohdabdel/humm-for-special-education
- Branch: main
- Starting commit SHA: 718228832927d50fe2be6f2f005590b330e16fd2
- Execution date/time UTC: 2026-08-22T01:14:36Z
- Scope: وثيقة تخطيط فقط. لا يوجد تنفيذ أو تعديل على الكود أو قاعدة البيانات.

## 2. مصادر الأدلة داخل المستودع

- `AGENTS.md`
- `docs/DECISIONS.md`
- `docs/audits/SECRET-CONTAINMENT-EXECUTION-RECORD.md`
- `src/lib/db/schema/planning/schema.ts`
- `src/components/case-workspace/NeedsSection.tsx`
- `src/components/case-workspace/GoalsSection.tsx`
- `src/components/case-workspace/MeasurementPlanPanel.tsx`
- `src/components/case-workspace/MeasurementDefinitionsSection.tsx`
- `src/components/case-workspace/SessionCard.tsx`
- `src/components/case-workspace/SessionCreationPanel.tsx`
- `src/components/case-workspace/QuickCapturePanel.tsx`
- `drizzle/`
- `drizzle/meta/_journal.json`
- `drizzle.config.ts`
- `supabase/migrations/`
- `supabase/config.toml`
- `package.json`
- `bun.lock`
- `.github/workflows/main.yml`

لم يتم فحص أو طباعة أي قيم من ملفات البيئة أو الأسرار.

## 3. ملخص تنفيذي للمخاطر

المستودع يحتوي على تقدم واضح في حوكمة Phase 1، خصوصًا وجود دوال RPC hardened لاحقة في `drizzle/0009` و`drizzle/0010` و`drizzle/0011`. مع ذلك، ما زالت الواجهة تستخدم direct writes في مكونات رئيسية، وبعض الجداول الحساسة مثل `goal_need_link` لا تظهر لها معالجة hardening لاحقة مكافئة لمعالجة `goal` و`need`.

أعلى مخاطر التنفيذ الحالية هي:

- `goal_need_link` بدأ في `drizzle/0002_blushing_donald_blake.sql` مع `GRANT SELECT, INSERT, UPDATE ON public.goal_need_link TO authenticated` وسياسات direct insert/update، ولا يوجد في migrations اللاحقة ما يثبت revoke للكتابة أو RPC محكوم للربط.
- الواجهة ما زالت تستدعي `supabase.from(...).insert/update` بدل RPCs موجودة مثل `finalize_goal_for_review_hardened`, `approve_goal_hardened`, `create_measurement_plan_hardened`, `create_session_hardened`, `update_session_status_hardened`, `create_observation_hardened`, و`create_data_point_hardened`.
- مصدر الهجرات منقسم بين `drizzle/` و`supabase/migrations/`، و`drizzle/meta/_journal.json` يتوقف عند `0005` بينما الملفات تمتد إلى `0013`.
- CI يستخدم `npm ci` و`cache: npm` بينما المستودع يحتوي `bun.lock` فقط.
- الوثائق الحوكمية المحلية ناقصة؛ الموجود فعليًا هو `docs/DECISIONS.md` وسجلات audit فقط.

## 4. Remediation Priority Order

1. تجميد أي implementation يمس قاعدة البيانات حتى يتم live Supabase schema verification ومصالحة مصدر الهجرات.
2. معالجة `goal_need_link` كأولوية حرجة: revoke مباشر، RPCs محكومة، تحقق same Case/same Learner، audit/provenance.
3. نقل الواجهة من direct writes إلى RPCs الموجودة حيثما توفرت، وتعطيل المسارات التي لا تملك RPC آمنًا بعد.
4. إصلاح CI package-manager consistency وإضافة quality gates تدريجية.
5. إنشاء الوثائق الحوكمية المحلية المطلوبة قبل أي أوامر تنفيذ كبيرة لاحقة.

## 5. goal_need_link Database Access Controls

### Current State

`src/lib/db/schema/planning/schema.ts` يعرف `goalNeedLink` كجدول يربط `goal_id` و`need_id` مع `relationship_type`, `primary_link`, و`rationale`.

في `drizzle/0002_blushing_donald_blake.sql`:

- تم إنشاء جدول `goal_need_link`.
- يوجد `ON DELETE cascade` من `goal` إلى `goal_need_link`.
- يوجد `ON DELETE restrict` من `need` إلى `goal_need_link`.
- تم منح `authenticated` صلاحيات `SELECT, INSERT, UPDATE`.
- تم منح `service_role` صلاحيات `ALL`.
- تم تفعيل RLS.
- توجد سياسات `goal_need_link_select_case_members`, `goal_need_link_insert_case_members`, و`goal_need_link_update_case_members`.
- السياسات تعتمد على direct cross-table RLS subquery عبر `public.goal`.

لا يظهر في `drizzle/0009_harden_goal_need_governance.sql` revoke أو hardening مباشر لـ`goal_need_link`، رغم أنه يعالج `goal`, `need`, `governance_audit_log`, و`quality_disclosures` ويضيف `finalize_goal_for_review_hardened()` و`approve_goal_hardened()`.

### Risk

الخطر حرج لأن `GoalNeedLink` يمثل professional provenance للقاعدة: "No Goal without a documented Need source". إبقاء direct write على جدول الربط يسمح نظريًا بتعديل مصدر الهدف أو تبريره خارج مسار governed command، وقد يضعف traceability وaudit.

وجود direct cross-table RLS subquery يخالف درس D-33 في `docs/DECISIONS.md`: أي سياسة RLS تستعلم جدولًا له RLS خاص يجب أن تستخدم `SECURITY DEFINER` helper لتجنب recursion أو leakage.

### Recommended Next Action

إنشاء migration لاحقة، بعد live verification، تحقق posture التالي:

- `ALTER TABLE public.goal_need_link ENABLE ROW LEVEL SECURITY`.
- `REVOKE ALL ON TABLE public.goal_need_link FROM anon, authenticated`.
- `GRANT SELECT ON TABLE public.goal_need_link TO authenticated`.
- لا direct `INSERT/UPDATE/DELETE` لـ`anon` أو `authenticated`.
- إنشاء `SECURITY DEFINER` helper للتحقق من case access دون direct RLS recursion.
- إنشاء RPCs محكومة:
  - `link_need_to_goal_hardened()`
  - `unlink_need_from_goal_hardened()`
  - `replace_goal_need_links_hardened()`
- فرض same Case وsame Learner بين `goal` و`need`.
- منع duplicates عبر unique constraint أو تحقق داخل RPC.
- منع unlink يترك `goal` بلا documented Need source.
- تسجيل `governance_audit_log` لكل link/unlink/replace.
- عدم استخدام physical deletion إذا اعتُبر الرابط سجلًا مهنيًا؛ البديل المفضل هو status/revocation metadata إن احتاجت الحوكمة ذلك.

### Dependencies

- live Supabase schema verification قبل كتابة migration.
- حسم هل `goal_need_link` يحتاج soft revocation بدل delete.
- حسم contract النهائي لحقول audit/provenance.
- مصالحة مصدر الهجرات قبل اختيار مكان migration.

### Validation and Test Requirements

- اختبار أن `authenticated` لا يستطيع direct insert/update/delete على `goal_need_link`.
- اختبار أن SELECT يعمل فقط لحالات يملك المستخدم وصولًا لها.
- اختبار أن RPC يرفض اختلاف `case_id` أو `learner_id` بين `goal` و`need`.
- اختبار منع duplicate link.
- اختبار منع إزالة آخر Need source لهدف قائم.
- اختبار audit event لكل إجراء.
- اختبار عدم وجود direct cross-table RLS recursion.

### Implementation Blocked

نعم. التنفيذ محجوب حتى يتم live schema verification ومصالحة مصدر الهجرات وحسم deletion/revocation semantics.

## 6. Front-End Writes That Should Use Existing Database RPCs

### Current State

الواجهة تستخدم Supabase client مباشرة في مكونات `case-workspace`.

| Component | Current direct write | Existing or required governed path |
| --- | --- | --- |
| `NeedsSection.tsx` | `supabase.from("need").insert(...)` | لا يظهر RPC موجود لإنشاء `need`; مطلوب `create_need_hardened()` أو command handler قبل استمرار direct write. |
| `GoalsSection.tsx` | `supabase.from("goal").insert(...)` | لا يظهر RPC موجود لإنشاء goal مع need link atomic؛ مطلوب `create_goal_from_need_hardened()`. |
| `GoalsSection.tsx` | `supabase.from("goal_need_link").insert(...)` | مطلوب `link_need_to_goal_hardened()` أو دمجه داخل create-goal RPC. |
| `GoalsSection.tsx` | `supabase.from("goal").update(...)` لإرسال المراجعة | موجود `finalize_goal_for_review_hardened(uuid)`. |
| `GoalsSection.tsx` | `supabase.from("goal").update(...)` للاعتماد/الرفض | موجود `approve_goal_hardened(uuid, text)`. |
| `MeasurementPlanPanel.tsx` | `supabase.from("measurement_plan").insert(...)` | موجود `create_measurement_plan_hardened(uuid, text, text)`. |
| `MeasurementDefinitionsSection.tsx` | `supabase.from("measurement_definition").insert(...)` | موجود `create_measurement_definition_hardened(...)`. |
| `MeasurementDefinitionsSection.tsx` | `supabase.from("measurement_definition").update(...)` | موجود `activate_measurement_definition_hardened(uuid)`. |
| `SessionCreationPanel.tsx` | `supabase.from("session").insert(...)` | موجود `create_session_hardened(...)`. |
| `SessionCard.tsx` | `supabase.from("session").update(...)` | موجود `update_session_status_hardened(...)`. |
| `QuickCapturePanel.tsx` | `supabase.from("observation").insert(...)` | موجود `create_observation_hardened(...)`. |
| `QuickCapturePanel.tsx` | `supabase.from("data_point").insert(...)` | موجود `create_data_point_hardened(...)`. |

### Risk

الخطر عالٍ لأن الواجهة قد تتجاوز audit events، role assertions، approval gates، state transitions، وحماية no-direct-write الموجودة في migrations اللاحقة. كما أن أي direct write سيكسر عند تطبيق revoke الصحيح، فيظهر الخلل للمستخدم بدل أن يكون transition مخططًا.

### Recommended Next Action

تنفيذ migration UI-to-RPC على مراحل:

1. استبدال `finalizeGoal` بـ`supabase.rpc("finalize_goal_for_review_hardened", ...)`.
2. استبدال `decideGoal` بـ`supabase.rpc("approve_goal_hardened", ...)` مع contract واضح للقرار والسبب.
3. استبدال `MeasurementPlanPanel` و`MeasurementDefinitionsSection` بـRPCs الموجودة في `drizzle/0011`.
4. استبدال session وobservation وdata point writes بـRPCs الموجودة في `drizzle/0010`.
5. تعطيل إنشاء `need` وgoal/link direct write أو إنشاء RPCs محكومة لها قبل الإتاحة.
6. بعد انتقال الواجهة، تطبيق revoke نهائي على direct writes للجداول المحكومة.

### Dependencies

- التأكد أن RPCs موجودة فعلًا في live Supabase لا في ملفات `drizzle/` فقط.
- تحديث Supabase generated types عند الحاجة.
- تحديد input/output contracts للـRPCs في `API-CONTRACTS.md`.
- وجود tests تغطي error states وcache invalidation.

### Validation and Test Requirements

- unit/integration tests لكل mutation path.
- اختبار أن كل mutation يسجل audit event حيث يلزم.
- اختبار أن UI يعرض pending/review/approval states ولا يسمح بمسارات direct bypass.
- اختبار cache invalidation بعد كل RPC: `goals`, `needs`, `measurement-plan`, `measurement-definitions`, `todays-sessions`, `session-card`, `observations`.
- اختبار أن direct writes مرفوضة بعد revoke.
- اختبار browser flow حقيقي بعد كل RLS/RPC تغيير، اتباعًا لدرس D-33.

### Implementation Blocked

جزئيًا. المسارات التي لها RPC موجودة يمكن التخطيط لتنفيذها بعد live verification. مسارات `need` وcreate goal/link محجوبة حتى تتوفر RPCs محكومة.

## 7. Migration History Split Between drizzle/ and supabase/migrations/

### Current State

`drizzle.config.ts` يحدد:

- `schema: "./src/lib/db/schema.ts"`
- `out: "./drizzle"`
- `dbCredentials.url` من `DATABASE_URL`

`drizzle/` يحتوي:

- `0000_fearless_luckman.sql`
- `0001_shallow_mysterio.sql`
- `0002_blushing_donald_blake.sql`
- `0003_two_gate_approval.sql`
- `0004_enable_rls_on_learner_team_member.sql`
- `0005_daily_practice_step1.sql`
- `0007_fix_team_member_case_membership_rls_recursion.sql`
- `0008_progress_tracker_step1.sql`
- `0009_harden_goal_need_governance.sql`
- `0010_harden_execution_progress_writes.sql`
- `0011_harden_measurement_governance.sql`
- `0012_harden_core_cases_and_memberships.sql`
- `0013_establish_organizations_native.sql`

لا يوجد `0006` في inventory الحالي.

`drizzle/meta/_journal.json` يسجل فقط `0000` إلى `0005`.

`supabase/migrations/` يحتوي:

- `20260818170741_cca59796-5c1b-4fd0-ad6e-a0da62997b3b.sql`
- `20260818170755_f3d30de4-ef72-472b-bc80-797d5070b474.sql`
- `20260818171641_957931f4-5854-4d11-b0d1-e25c68086e06.sql`
- `20260818191606_a2e425b7-53d8-4128-9832-ada3d5858601.sql`

### Risk

الخطر عالٍ لأن مصدر الحقيقة غير واضح. قد تكون بعض migrations مطبقة في live Supabase ولم تدخل journal، أو قد تكون موجودة في ملفات فقط. أي consolidation أو إعادة ترتيب بدون verification قد يؤدي إلى drift أو تكرار أو إسقاط قيود حوكمة.

### Recommended Next Action

لا يتم نقل أو حذف أو دمج أي migration الآن. الخطوة التالية يجب أن تكون live verification منفصلة تقارن:

- الجداول والأعمدة والـenums.
- RLS enabled state.
- grants الفعلية.
- policies.
- functions وfunction privileges.
- triggers.
- migration history في Supabase إن كانت متاحة.

بعدها يختار الفريق مصدرًا رسميًا واحدًا للمستقبل. التوصية المبدئية: اعتماد `drizzle/` كمصدر authoring إذا كان Drizzle هو أداة schema generation، مع mirror أو سجل واضح لما يطبق عبر Supabase CLI. لكن لا يجوز اعتماد هذا قبل verification.

### Dependencies

- صلاحية read-only على live Supabase.
- قرار مالك المشروع حول أداة migration الرسمية.
- توثيق reconciliation في ADR قبل أي تعديل.

### Validation and Test Requirements

- query تتحقق من `information_schema.tables` و`information_schema.columns`.
- query تتحقق من `pg_policies`.
- query تتحقق من `pg_class.relrowsecurity`.
- query تتحقق من `information_schema.role_table_grants`.
- query تتحقق من `pg_proc` وfunction grants.
- مقارنة كل نتيجة مع inventory المستودع.
- acceptance: لا migration consolidation قبل تطابق live schema مع source مختار أو توثيق drift صريح.

### Implementation Blocked

نعم. أي migration جديد أو consolidation محجوب حتى live Supabase schema verification.

## 8. CI Package-Manager Consistency

### Current State

`package.json` يحتوي scripts لـ`dev`, `build`, `lint`, `format`, وDrizzle. لا يحتوي scripts صريحة لـ`typecheck`, `format:check`, أو `test`.

المستودع يحتوي `bun.lock` فقط، ولا يظهر `package-lock.json`, `pnpm-lock.yaml`, أو `yarn.lock`.

`.github/workflows/main.yml` يستخدم:

- `actions/setup-node@v4`
- `cache: "npm"`
- `npm ci`
- `npx tsc --noEmit --strict`
- Gitleaks secret scan

### Risk

الخطر عالٍ لأن `npm ci` يتوقع `package-lock.json`. مع وجود `bun.lock` فقط قد تفشل CI عند install أو تستخدم بيئة مختلفة عن بيئة التطوير المحلية. كذلك quality gates ناقصة: lint، format check، tests، migration consistency، وRLS/RPC verification.

### Recommended Next Action

قرار واحد من المالك:

- إما اعتماد Bun: استخدام `oven-sh/setup-bun`, `bun install --frozen-lockfile`, و`bun run ...`.
- أو اعتماد npm: إنشاء `package-lock.json` رسميًا وتعديل lockfile policy.

التوصية الحالية حسب الأدلة: اعتماد Bun لأن lockfile الوحيد هو `bun.lock`.

بعد حسم package manager، إضافة scripts:

- `typecheck`
- `format:check`
- `test`
- `db:check` أو migration consistency check

ثم تحديث workflow في مهمة منفصلة.

### Dependencies

- قرار package manager.
- وجود test runner أو قرار تأجيله.
- مصالحة migration source قبل gate الخاص بالهجرات.

### Validation and Test Requirements

- install reproducibility.
- typecheck.
- lint.
- format check.
- test execution.
- migration consistency.
- RLS/RPC verification tests عند توفرها.
- secret scanning.
- branch protection يتطلب كل gates قبل merge.

### Implementation Blocked

جزئيًا. إصلاح CI package manager غير محجوب تقنيًا، لكنه يحتاج قرار lockfile policy. Gates المتعلقة بالهجرات وRLS/RPC محجوبة حتى reconciliation وtest harness.

## 9. Missing Repository-Local Governance Documentation

### Current State

الموجود محليًا:

- `docs/DECISIONS.md`
- `docs/audits/SECRET-CONTAINMENT-EXECUTION-RECORD.md`
- هذه الوثيقة بعد إضافتها.

غير موجود حسب inventory:

- `ENTITY-MAPPING-LEDGER.md`
- `GOVERNANCE.md`
- `AI-GOVERNANCE.md`
- `DATA-CONTRACTS.md`
- `BUILD-ORDER.md`
- `SECURITY-RULES.md`
- `API-CONTRACTS.md`
- `TEST-STRATEGY.md`
- `ACCEPTANCE-CRITERIA/`
- `ADR/`
- `PROMPTS/`

### Risk

الخطر متوسط إلى عالٍ لأن future implementation prompts ستعتمد على ذاكرة محادثات أو وثائق خارجية غير مرفقة. هذا يزيد خطر اختراع كيانات، إعادة ترتيب canonical chain، أو تجاوز guardrails الخاصة بالـAI والApproval Gates.

### Recommended Next Action

إنشاء حزمة وثائق محلية في مهمة منفصلة، دون إعادة تفسير المصادر:

- `docs/GOVERNANCE.md`: القواعد الملزمة من `AGENTS.md` و`docs/DECISIONS.md`.
- `docs/BUILD-ORDER.md`: Phase 1 order وdeferred products.
- `docs/SECURITY-RULES.md`: RLS/RPC/direct-write policy.
- `docs/API-CONTRACTS.md`: RPC contracts الحالية والمطلوبة.
- `docs/DATA-CONTRACTS.md`: canonical chain وschema segmentation.
- `docs/AI-GOVERNANCE.md`: AI allowed/forbidden actions.
- `docs/ENTITY-MAPPING-LEDGER.md`: ربط product-facing names بالكيانات التقنية.
- `docs/TEST-STRATEGY.md`: gates وأدلة التحقق.
- `docs/ACCEPTANCE-CRITERIA/`: معايير قبول لكل remediation.
- `docs/ADR/`: قرارات هندسية مستقبلية مثل migration source.
- `docs/PROMPTS/`: أوامر التنفيذ المعتمدة.

### Dependencies

- مراجعة المالك لأي نسخ من HIMAM-KB-SEC05, SEC13, SEC14 إذا كانت مطلوبة.
- عدم نسخ أو إعادة صياغة وثائق خارجية غير متاحة بدون تصريح.
- تعيين reviewer للحوكمة.

### Validation and Test Requirements

- كل وثيقة تذكر مصدرها.
- لا تضيف الوثائق كيانًا جديدًا أو تعدل canonical chain.
- كل contract يطابق SQL/function signature الموجودة أو يعلّم نفسه كـproposed.
- PR review من المالك أو reviewer حوكمي.

### Implementation Blocked

غير محجوب لإنشاء skeletons محلية مستندة إلى `AGENTS.md` و`docs/DECISIONS.md`. لكنه محجوب للنسخ التفصيلي من SEC05/SEC13/SEC14 حتى يوفر المالك تلك المصادر أو يوافق على الاعتماد على المتاح فقط.

## 10. Unresolved Questions

- هل `goal_need_link` يجب أن يدعم soft revocation بدل delete للحفاظ على professional record؟
- هل create goal وlink need يجب أن يكونا RPC واحدة atomic أم RPCs منفصلة؟
- هل live Supabase يحتوي migrations `0009` إلى `0013` فعلًا أم هي ملفات محلية فقط؟
- هل مصدر الحقيقة المستقبلي للهجرات هو `drizzle/` أم `supabase/migrations/` أم نمط مزدوج موثق؟
- هل package manager الرسمي هو Bun بسبب `bun.lock` أم npm بعد إنشاء lockfile جديد؟
- ما المصدر المعتمد لإدخال تفاصيل HIMAM-KB-SEC05, SEC13, SEC14 في الوثائق المحلية؟
- ما test runner المعتمد لاختبارات RLS/RPC والواجهة؟

## 11. Recommended Next Implementation Task

المهمة التالية الموصى بها:

`HIMAM-CODEX-02A: Live Supabase Schema Verification and Migration Source-of-Truth Decision`

نطاقها يجب أن يكون read-only على قاعدة البيانات، وتنتج تقريرًا يقارن live schema مع `drizzle/`, `drizzle/meta/_journal.json`, و`supabase/migrations/`. لا ينبغي تنفيذ hardening أو UI migration قبل هذه المهمة.

بعد اكتمالها، تكون أول مهمة تنفيذية مناسبة:

`HIMAM-CODEX-02B: Harden goal_need_link access through governed RPCs`

## 12. Out of Scope

لم يتم تنفيذ أي مما يلي:

- تعديل application code.
- تعديل UI files.
- تعديل database migrations.
- تعديل Supabase configuration.
- تشغيل migrations.
- تعديل RLS أو RPC أو grants في قاعدة البيانات.
- تعديل CI workflows.
- تعديل environment files أو secrets.
- تعديل Git history.
