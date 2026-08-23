-- ===== HITRI POPRAVEK - ONEMOGOČI RLS =====
-- Ta skript onemogoči Row Level Security za vse tabele (za testiranje)

-- OPOMBA: To je samo za testiranje! V produkciji uporabi ustrezne policy-je.

-- 1. PREVERI TRENUTNO STANJE RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('swimmers', 'trainers', 'terms', 'attendance', 'term_status', 'trainer_attendance', 'trainer_terms')
ORDER BY tablename;

-- 2. ONEMOGOČI RLS ZA VSE TABELE
ALTER TABLE swimmers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE term_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_terms DISABLE ROW LEVEL SECURITY;

-- 3. PREVERI, DA JE RLS ONEMOGOČEN
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('swimmers', 'trainers', 'terms', 'attendance', 'term_status', 'trainer_attendance', 'trainer_terms')
ORDER BY tablename;

-- 4. PREVERI, ČE SO PODATKI V BAZI
SELECT 'swimmers' as tabela, COUNT(*) as stevilo_zapisev FROM swimmers WHERE is_deleted = false
UNION ALL
SELECT 'trainers' as tabela, COUNT(*) as stevilo_zapisev FROM trainers WHERE is_deleted = false
UNION ALL
SELECT 'terms' as tabela, COUNT(*) as stevilo_zapisev FROM terms
UNION ALL
SELECT 'attendance' as tabela, COUNT(*) as stevilo_zapisev FROM attendance
UNION ALL
SELECT 'term_status' as tabela, COUNT(*) as stevilo_zapisev FROM term_status
UNION ALL
SELECT 'trainer_attendance' as tabela, COUNT(*) as stevilo_zapisev FROM trainer_attendance
UNION ALL
SELECT 'trainer_terms' as tabela, COUNT(*) as stevilo_zapisev FROM trainer_terms;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da je RLS onemogočen za vse tabele
-- 3. Preveri, da so podatki v bazi podatkov
-- 4. Testiraj admin aplikacijo v incognito načinu
-- 5. Če se podatki še vedno ne naložijo, preveri konzolo za napake
