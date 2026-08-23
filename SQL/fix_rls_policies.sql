-- ===== POPRAVEK RLS POLICY-JEV ZA ADMIN APLIKACIJO =====
-- Ta skript nastavi ustrezne Row Level Security policy-je za admin aplikacijo

-- 1. PREVERI TRENUTNO STANJE RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('swimmers', 'trainers', 'terms', 'attendance', 'term_status', 'trainer_attendance', 'trainer_terms')
ORDER BY tablename;

-- 2. PREVERI OBSTOJEČE POLICY-JE
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('swimmers', 'trainers', 'terms', 'attendance', 'term_status', 'trainer_attendance', 'trainer_terms')
ORDER BY tablename, policyname;

-- 3. DODAJ POLICY-JE ZA VSE TABELE (če še ne obstajajo)

-- Policy za swimmers tabelo
DO $$ 
BEGIN
    -- Preveri, če policy že obstaja
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'swimmers' 
        AND policyname = 'Allow public access'
    ) THEN
        -- Dodaj policy za vse operacije
        CREATE POLICY "Allow public access" ON swimmers 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za swimmers tabelo';
    ELSE
        RAISE NOTICE 'Policy za swimmers tabelo že obstaja';
    END IF;
END $$;

-- Policy za trainers tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trainers' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON trainers 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za trainers tabelo';
    ELSE
        RAISE NOTICE 'Policy za trainers tabelo že obstaja';
    END IF;
END $$;

-- Policy za terms tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'terms' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON terms 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za terms tabelo';
    ELSE
        RAISE NOTICE 'Policy za terms tabelo že obstaja';
    END IF;
END $$;

-- Policy za attendance tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'attendance' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON attendance 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za attendance tabelo';
    ELSE
        RAISE NOTICE 'Policy za attendance tabelo že obstaja';
    END IF;
END $$;

-- Policy za term_status tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'term_status' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON term_status 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za term_status tabelo';
    ELSE
        RAISE NOTICE 'Policy za term_status tabelo že obstaja';
    END IF;
END $$;

-- Policy za trainer_attendance tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trainer_attendance' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON trainer_attendance 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za trainer_attendance tabelo';
    ELSE
        RAISE NOTICE 'Policy za trainer_attendance tabelo že obstaja';
    END IF;
END $$;

-- Policy za trainer_terms tabelo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trainer_terms' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON trainer_terms 
        FOR ALL TO anon USING (true);
        
        RAISE NOTICE 'Policy dodan za trainer_terms tabelo';
    ELSE
        RAISE NOTICE 'Policy za trainer_terms tabelo že obstaja';
    END IF;
END $$;

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

-- 5. PREVERI KONČNO STANJE POLICY-JEV
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('swimmers', 'trainers', 'terms', 'attendance', 'term_status', 'trainer_attendance', 'trainer_terms')
ORDER BY tablename, policyname;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se policy-ji dodali
-- 3. Preveri, da so podatki v bazi podatkov
-- 4. Testiraj admin aplikacijo v incognito načinu
-- 5. Če se podatki še vedno ne naložijo, preveri konzolo za napake
