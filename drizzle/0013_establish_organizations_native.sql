BEGIN;

-- 1. إنشاء جدول organizations إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Backfill existing organization IDs already referenced by live tables
INSERT INTO public.organizations (id, name, code, active)
SELECT
  org_id,
  'HIMAM Organization ' || upper(substr(replace(org_id::text, '-', ''), 1, 8)),
  'ORG-' || upper(substr(replace(org_id::text, '-', ''), 1, 12)),
  true
FROM (
  SELECT DISTINCT organization_id AS org_id FROM public.team_member
  UNION
  SELECT DISTINCT organization_id AS org_id FROM public."case"
  UNION
  SELECT DISTINCT organization_id AS org_id FROM public.governance_audit_log
  UNION
  SELECT DISTINCT organization_id AS org_id FROM public.quality_disclosures
) existing_orgs
WHERE org_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 3. تضييق الصلاحيات
REVOKE ALL ON TABLE public.organizations FROM anon, authenticated;
GRANT SELECT ON TABLE public.organizations TO authenticated;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 4. دالة مساعدة أمنية (SECURITY DEFINER) للتحقق من انتماء المستخدم للمؤسسة عبر team_member
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_member tm
    WHERE tm.organization_id = _org_id
      AND tm.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.user_belongs_to_organization(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(uuid) TO authenticated;

-- 5. سياسة RLS لجدول organizations باستخدام الدالة الآمنة
DROP POLICY IF EXISTS organizations_select_member ON public.organizations;
CREATE POLICY organizations_select_member
ON public.organizations
FOR SELECT
TO authenticated
USING (public.user_belongs_to_organization(id));

-- 6. ربط Foreign Keys لجداول الحوكمة الحالية بـ organizations(id)
ALTER TABLE public.governance_audit_log
  DROP CONSTRAINT IF EXISTS governance_audit_log_organization_id_fkey,
  ADD CONSTRAINT governance_audit_log_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

ALTER TABLE public.quality_disclosures
  DROP CONSTRAINT IF EXISTS quality_disclosures_organization_id_fkey,
  ADD CONSTRAINT quality_disclosures_organization_id_fkey
  FOREIGN KEY (organization_id) REFERENCES public.organizations(id);

COMMIT;
