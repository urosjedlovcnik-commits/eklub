-- Faza 2: RLS po vlogah (trener / super_admin)
-- Poženite v Supabase SQL Editor PO phase1_trainer_auth.sql in phase1_authenticated_rls.sql.
--
-- Pravila:
--   super_admin  → vse (koledar + finance)
--   trainer      → samo svoji termini (trainer_terms); vsi plavalci READ (nadomeščanje)
--   anon         → brez dostopa (prijava obvezna)
--
-- Admin panel mora uporabljati Supabase Auth (isti login kot koledar).

-- ===== Helper funkcije =====

CREATE OR REPLACE FUNCTION public.current_trainer_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id FROM public.trainers t WHERE t.user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.user_id = auth.uid()
      AND t.role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_term(p_term_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin()
  OR EXISTS (
    SELECT 1
    FROM public.trainer_terms tt
    JOIN public.trainers tr ON tr.id = tt.trainer_id
    WHERE tt.term_id = p_term_id
      AND tr.user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.current_trainer_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_term(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_trainer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_term(text) TO authenticated;

-- ===== Počisti stare politike =====

DO $$
DECLARE
  r RECORD;
  tables text[] := ARRAY[
    'terms', 'swimmers', 'trainers', 'trainer_terms',
    'attendance', 'term_status', 'trainer_attendance',
    'swimmer_term_assignments', 'substitute_trainers',
    'seasons', 'swimmer_season_billing', 'swimmer_monthly_fees',
    'term_costs', 'trainer_rates', 'manual_costs',
    'accounting_report_swimmer_order'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      FOR r IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ===== KOLEDAR: terms =====

CREATE POLICY "terms_select" ON public.terms
  FOR SELECT TO authenticated
  USING (public.can_access_term(id));

CREATE POLICY "terms_write_super_admin" ON public.terms
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ===== KOLEDAR: swimmers (vsi plavalci — nadomeščanje) =====

CREATE POLICY "swimmers_select_all" ON public.swimmers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "swimmers_write_super_admin" ON public.swimmers
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "swimmers_update_super_admin" ON public.swimmers
  FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "swimmers_delete_super_admin" ON public.swimmers
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ===== KOLEDAR: trainers (imena za nadomeščanje) =====

CREATE POLICY "trainers_select_all" ON public.trainers
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "trainers_write_super_admin" ON public.trainers
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ===== KOLEDAR: trainer_terms =====

CREATE POLICY "trainer_terms_select" ON public.trainer_terms
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR trainer_id = public.current_trainer_id()
  );

CREATE POLICY "trainer_terms_write_super_admin" ON public.trainer_terms
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ===== KOLEDAR: attendance =====

CREATE POLICY "attendance_select" ON public.attendance
  FOR SELECT TO authenticated
  USING (public.can_access_term(term_id));

CREATE POLICY "attendance_insert" ON public.attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "attendance_update" ON public.attendance
  FOR UPDATE TO authenticated
  USING (public.can_access_term(term_id))
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "attendance_delete_super_admin" ON public.attendance
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ===== KOLEDAR: term_status =====

CREATE POLICY "term_status_select" ON public.term_status
  FOR SELECT TO authenticated
  USING (public.can_access_term(term_id));

CREATE POLICY "term_status_insert" ON public.term_status
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "term_status_update" ON public.term_status
  FOR UPDATE TO authenticated
  USING (public.can_access_term(term_id))
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "term_status_delete_super_admin" ON public.term_status
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ===== KOLEDAR: trainer_attendance =====

CREATE POLICY "trainer_attendance_select" ON public.trainer_attendance
  FOR SELECT TO authenticated
  USING (public.can_access_term(term_id));

CREATE POLICY "trainer_attendance_insert" ON public.trainer_attendance
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "trainer_attendance_update" ON public.trainer_attendance
  FOR UPDATE TO authenticated
  USING (public.can_access_term(term_id))
  WITH CHECK (public.can_access_term(term_id));

CREATE POLICY "trainer_attendance_delete_super_admin" ON public.trainer_attendance
  FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- ===== KOLEDAR: swimmer_term_assignments (read vsi — filtrira UI) =====

CREATE POLICY "sta_select_all" ON public.swimmer_term_assignments
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "sta_write_super_admin" ON public.swimmer_term_assignments
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ===== KOLEDAR: substitute_trainers (če tabela obstaja) =====

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'substitute_trainers'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "substitute_trainers_select" ON public.substitute_trainers
        FOR SELECT TO authenticated
        USING (public.can_access_term(term_id))
    $p$;
    EXECUTE $p$
      CREATE POLICY "substitute_trainers_write" ON public.substitute_trainers
        FOR ALL TO authenticated
        USING (public.can_access_term(term_id) OR public.is_super_admin())
        WITH CHECK (public.can_access_term(term_id) OR public.is_super_admin())
    $p$;
  END IF;
END $$;

-- ===== FINANCE / ADMIN: samo super_admin =====

DO $$
DECLARE
  finance_tables text[] := ARRAY[
    'seasons', 'swimmer_season_billing', 'swimmer_monthly_fees',
    'term_costs', 'trainer_rates', 'manual_costs',
    'accounting_report_swimmer_order'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY finance_tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY "finance_super_admin" ON public.%I FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- Preverite super admin povezavo:
-- SELECT email, role, user_id FROM trainers WHERE role = 'super_admin';
