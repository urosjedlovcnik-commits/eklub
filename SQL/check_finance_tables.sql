-- ===== PREVERJANJE IN USTVARJANJE FINANČNIH TABEL =====
-- Ta skript preveri in ustvari tabele za vadnine, stroške terminov in urne postavke trenerjev

-- 1. PREVERI OBSTOJEČE TABELE
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('swimmer_monthly_fees', 'term_costs', 'trainer_rates')
ORDER BY table_name;

-- 2. USTVARI TABELO ZA MESEČNE PRISTOJBINE PLAVALCEV (če ne obstaja)
CREATE TABLE IF NOT EXISTS "public"."swimmer_monthly_fees" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "swimmer_id" UUID NOT NULL REFERENCES "public"."swimmers"("id") ON DELETE CASCADE,
    "month" INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    "year" INTEGER NOT NULL CHECK (year >= 2020 AND year <= 2030),
    "monthly_fee" DECIMAL(10,2) NOT NULL DEFAULT 80.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(swimmer_id, month, year)
);

-- 3. USTVARI TABELO ZA STROŠKE TERMINOV (če ne obstaja)
CREATE TABLE IF NOT EXISTS "public"."term_costs" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "term_id" TEXT NOT NULL REFERENCES "public"."terms"("id") ON DELETE CASCADE,
    "cost_per_hour" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(term_id)
);

-- 4. USTVARI TABELO ZA URNE POSTAVKE TRENERJEV (če ne obstaja)
CREATE TABLE IF NOT EXISTS "public"."trainer_rates" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "trainer_id" UUID NOT NULL REFERENCES "public"."trainers"("id") ON DELETE CASCADE,
    "rate_per_session" DECIMAL(10,2) NOT NULL DEFAULT 25.00,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trainer_id)
);

-- 5. DODAJ INDEKSE ZA HITREJŠE ISKANJE
CREATE INDEX IF NOT EXISTS idx_swimmer_monthly_fees_swimmer_id ON "public"."swimmer_monthly_fees"("swimmer_id");
CREATE INDEX IF NOT EXISTS idx_swimmer_monthly_fees_month_year ON "public"."swimmer_monthly_fees"("month", "year");
CREATE INDEX IF NOT EXISTS idx_term_costs_term_id ON "public"."term_costs"("term_id");
CREATE INDEX IF NOT EXISTS idx_trainer_rates_trainer_id ON "public"."trainer_rates"("trainer_id");

-- 6. DODAJ RLS POLICY-JE ZA VSE TABELE
DO $$ 
BEGIN
    -- Policy za swimmer_monthly_fees
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'swimmer_monthly_fees' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON swimmer_monthly_fees 
        FOR ALL TO anon USING (true);
    END IF;
    
    -- Policy za term_costs
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'term_costs' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON term_costs 
        FOR ALL TO anon USING (true);
    END IF;
    
    -- Policy za trainer_rates
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trainer_rates' 
        AND policyname = 'Allow public access'
    ) THEN
        CREATE POLICY "Allow public access" ON trainer_rates 
        FOR ALL TO anon USING (true);
    END IF;
END $$;

-- 7. PREVERI OBSTOJEČE PODATKE
SELECT 'swimmer_monthly_fees' as tabela, COUNT(*) as stevilo_zapisev FROM swimmer_monthly_fees
UNION ALL
SELECT 'term_costs' as tabela, COUNT(*) as stevilo_zapisev FROM term_costs
UNION ALL
SELECT 'trainer_rates' as tabela, COUNT(*) as stevilo_zapisev FROM trainer_rates;

-- 8. DODAJ PRIMERNE PODATKE (če so tabele prazne)
-- Dodaj privzete stroške terminov
INSERT INTO term_costs (term_id, cost_per_hour)
SELECT id, 50.00
FROM terms
WHERE id NOT IN (SELECT term_id FROM term_costs)
ON CONFLICT (term_id) DO NOTHING;

-- Dodaj privzete urne postavke trenerjev
INSERT INTO trainer_rates (trainer_id, rate_per_session)
SELECT id, 25.00
FROM trainers
WHERE is_deleted = false
AND id NOT IN (SELECT trainer_id FROM trainer_rates)
ON CONFLICT (trainer_id) DO NOTHING;

-- 9. PREVERI KONČNO STANJE
SELECT 'swimmer_monthly_fees' as tabela, COUNT(*) as stevilo_zapisev FROM swimmer_monthly_fees
UNION ALL
SELECT 'term_costs' as tabela, COUNT(*) as stevilo_zapisev FROM term_costs
UNION ALL
SELECT 'trainer_rates' as tabela, COUNT(*) as stevilo_zapisev FROM trainer_rates;

-- 10. PRIKAŽI PRIMERNE PODATKE
SELECT 'Stroški terminov:' as info;
SELECT term_id, cost_per_hour FROM term_costs ORDER BY term_id;

SELECT 'Urne postavke trenerjev:' as info;
SELECT t.first_name, t.last_name, tr.rate_per_session 
FROM trainer_rates tr
JOIN trainers t ON tr.trainer_id = t.id
WHERE t.is_deleted = false
ORDER BY t.first_name, t.last_name;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se tabele ustvarile
-- 3. Preveri, da so se dodali primerni podatki
-- 4. Testiraj admin aplikacijo - vadnine, stroški in postavke bi se morali naložiti
