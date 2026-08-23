-- Preverjanje RLS / auth stanja (samo branje)
-- Poženite v Supabase SQL Editor ali preverite rezultat spodaj.

-- 1) Helper funkcije
SELECT proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('is_super_admin', 'can_access_term', 'current_trainer_id')
ORDER BY 1;
-- Pričakovano: vse 3 vrstice

-- 2) RLS vklopljen na ključnih tabelah
SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'terms', 'swimmers', 'trainers', 'trainer_terms',
    'attendance', 'term_status', 'trainer_attendance', 'seasons'
  )
ORDER BY 1;
-- Pričakovano: rls_enabled = true za vse

-- 3) Politike (osnovne)
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('terms', 'attendance', 'trainer_attendance', 'trainers', 'trainer_terms', 'swimmers')
ORDER BY tablename, policyname;

-- 4) can_access_term vključuje nadomeščanje?
SELECT pg_get_functiondef('public.can_access_term(text)'::regprocedure);
-- Pričakovano: omenja trainer_attendance

-- 5) Trenerji + Auth povezava
SELECT email, role, (user_id IS NOT NULL) AS linked_to_auth
FROM trainers
ORDER BY role DESC NULLS LAST, email;
-- linked_to_auth = false → prijava ne deluje, dokler ne povežete user_id

-- Če kaj manjka, po vrsti poženi:
--   SQL/phase1_trainer_auth.sql
--   SQL/phase1_authenticated_rls.sql
--   SQL/phase2_rls_security.sql
--   SQL/can_access_term_substitute.sql
