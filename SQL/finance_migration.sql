-- ===== MIGRACIJA FINANCE SISTEMA V SUPABASE =====
-- Ta skript ustvari potrebne tabele za finance sistem

-- 1. PREVERI IN POSODOBI OBSTOJEČE TABELE
-- Najprej odstrani obstoječe poglede, če obstajajo
DROP VIEW IF EXISTS "public"."finance_overview";

-- Če tabela term_costs obstaja z stolpcem cost_per_month, ga preimenuj
DO $$ 
BEGIN
    -- Preveri, če stolpec cost_per_month obstaja
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'term_costs' 
        AND column_name = 'cost_per_month'
    ) THEN
        -- Preimenuj stolpec
        ALTER TABLE "public"."term_costs" RENAME COLUMN "cost_per_month" TO "cost_per_hour";
        RAISE NOTICE 'Stolpec cost_per_month je bil preimenovan v cost_per_hour';
    END IF;
    
    -- Preveri, če stolpec cost_per_hour obstaja, če ne, ga dodaj
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'term_costs' 
        AND column_name = 'cost_per_hour'
    ) THEN
        -- Dodaj stolpec
        ALTER TABLE "public"."term_costs" ADD COLUMN "cost_per_hour" DECIMAL(10,2) DEFAULT 50.00;
        RAISE NOTICE 'Stolpec cost_per_hour je bil dodan';
    END IF;
END $$;

-- Če tabela trainer_rates obstaja z stolpcem hourly_rate_monthly, ga preimenuj
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_rates' 
        AND column_name = 'hourly_rate_monthly'
    ) THEN
        ALTER TABLE "public"."trainer_rates" RENAME COLUMN "hourly_rate_monthly" TO "rate_per_session";
        RAISE NOTICE 'Stolpec hourly_rate_monthly je bil preimenovan v rate_per_session';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_rates' 
        AND column_name = 'rate_per_session'
    ) THEN
        ALTER TABLE "public"."trainer_rates" ADD COLUMN "rate_per_session" DECIMAL(10,2) DEFAULT 25.00;
        RAISE NOTICE 'Stolpec rate_per_session je bil dodan';
    END IF;
END $$;

-- 2. USTVARI TABELE (ČE NE OBSTAJAJO)
-- 1. Ustvarjanje tabele za stroške prog po terminih (na uro)
CREATE TABLE IF NOT EXISTS "public"."term_costs" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "term_id" text NOT NULL REFERENCES "public"."terms"("id") ON DELETE CASCADE,
    "cost_per_hour" decimal(10,2) NOT NULL DEFAULT 50.00,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    UNIQUE("term_id")
);

-- 2. Ustvarjanje tabele za postavke trenerjev na termin
CREATE TABLE IF NOT EXISTS "public"."trainer_rates" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "trainer_id" text NOT NULL REFERENCES "public"."trainers"("id") ON DELETE CASCADE,
    "rate_per_session" decimal(10,2) NOT NULL DEFAULT 25.00,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    UNIQUE("trainer_id")
);

-- 3. Ustvarjanje tabele za mesečne pristojbine plavalcev
CREATE TABLE IF NOT EXISTS "public"."swimmer_monthly_fees" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "swimmer_id" text NOT NULL REFERENCES "public"."swimmers"("id") ON DELETE CASCADE,
    "month" integer NOT NULL CHECK (month >= 0 AND month <= 11),
    "year" integer NOT NULL CHECK (year >= 2000),
    "monthly_fee" decimal(10,2) NOT NULL DEFAULT 80.00,
    "discount" decimal(10,2) NOT NULL DEFAULT 0.00,
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now(),
    UNIQUE("swimmer_id", "month", "year")
);

-- 4. Dodajanje RLS politik
ALTER TABLE "public"."term_costs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."trainer_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."swimmer_monthly_fees" ENABLE ROW LEVEL SECURITY;

-- RLS politika za term_costs - samo admin lahko bere in piše
DROP POLICY IF EXISTS "term_costs_admin_access" ON "public"."term_costs";
CREATE POLICY "term_costs_admin_access" ON "public"."term_costs"
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS politika za trainer_rates - samo admin lahko bere in piše
DROP POLICY IF EXISTS "trainer_rates_admin_access" ON "public"."trainer_rates";
CREATE POLICY "trainer_rates_admin_access" ON "public"."trainer_rates"
    FOR ALL USING (auth.role() = 'authenticated');

-- RLS politika za swimmer_monthly_fees - samo admin lahko bere in piše
DROP POLICY IF EXISTS "swimmer_monthly_fees_admin_access" ON "public"."swimmer_monthly_fees";
CREATE POLICY "swimmer_monthly_fees_admin_access" ON "public"."swimmer_monthly_fees"
    FOR ALL USING (auth.role() = 'authenticated');

-- 5. Dodajanje triggerjev za updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_term_costs_updated_at ON "public"."term_costs";
CREATE TRIGGER update_term_costs_updated_at 
    BEFORE UPDATE ON "public"."term_costs" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trainer_rates_updated_at ON "public"."trainer_rates";
CREATE TRIGGER update_trainer_rates_updated_at 
    BEFORE UPDATE ON "public"."trainer_rates" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_swimmer_monthly_fees_updated_at ON "public"."swimmer_monthly_fees";
CREATE TRIGGER update_swimmer_monthly_fees_updated_at 
    BEFORE UPDATE ON "public"."swimmer_monthly_fees" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Vnos začetnih stroškov prog za obstoječe termine (privzeto 50€/uro)
INSERT INTO "public"."term_costs" ("term_id", "cost_per_hour")
SELECT DISTINCT "id", 50.00
FROM "public"."terms"
ON CONFLICT ("term_id") DO NOTHING;

-- 7. Vnos začetnih postavk za obstoječe trenerje (privzeto 25€/termin)
INSERT INTO "public"."trainer_rates" ("trainer_id", "rate_per_session")
SELECT DISTINCT "id", 25.00
FROM "public"."trainers"
WHERE "is_deleted" = false
ON CONFLICT ("trainer_id") DO NOTHING;

-- 8. Ustvarjanje pogleda za finance overview
CREATE OR REPLACE VIEW "public"."finance_overview" AS
SELECT
    t.id as term_id,
    t.label as term_name,
    COALESCE(tc.cost_per_hour, 0.00) as term_cost,
    tr.trainer_id,
    COALESCE(tr.rate_per_session, 0.00) as trainer_rate,
    s.id as swimmer_id,
    s.first_name,
    s.last_name,
    COALESCE(smf.monthly_fee, 0.00) as monthly_fee,
    COALESCE(smf.discount, 0.00) as discount
FROM "public"."terms" t
LEFT JOIN "public"."term_costs" tc ON t.id = tc.term_id
LEFT JOIN "public"."trainer_rates" tr ON tr.trainer_id IN (
    SELECT trainer_id FROM "public"."trainer_terms" WHERE term_id = t.id
)
LEFT JOIN "public"."swimmers" s ON s.terms::text LIKE '%' || t.id || '%'
LEFT JOIN "public"."swimmer_monthly_fees" smf ON s.id = smf.swimmer_id
WHERE (s.is_deleted = false OR s.is_deleted IS NULL)
  AND (tc.cost_per_hour IS NOT NULL OR tr.rate_per_session IS NOT NULL);

-- 9. Dodajanje indeksov za boljšo zmogljivost
CREATE INDEX IF NOT EXISTS idx_term_costs_term_id ON "public"."term_costs"("term_id");
CREATE INDEX IF NOT EXISTS idx_trainer_rates_trainer_id ON "public"."trainer_rates"("trainer_id");
CREATE INDEX IF NOT EXISTS idx_swimmer_monthly_fees_swimmer_id ON "public"."swimmer_monthly_fees"("swimmer_id");
CREATE INDEX IF NOT EXISTS idx_swimmer_monthly_fees_month_year ON "public"."swimmer_monthly_fees"("month", "year");

-- =====================================================
-- RAZLAGA SISTEMA STROŠKOV
-- =====================================================
-- 
-- STROŠKI PROG (na uro):
-- - Vsak termin ima svoj urni strošek (npr. 50€/uro)
-- - Skupni mesečni strošek = število načrtovanih in aktivnih treningov × trajanje v urah × urni strošek
-- - Deaktivirani treningi se ne upoštevajo
-- - Stroški se računajo na podlagi term_status (ali je termin aktiven za ta dan)
--
-- STROŠKI TRENERJEV:
-- - Vsak trener ima svojo postavko na termin (npr. 25€/termin)
-- - Skupni mesečni strošek = število terminov × postavko na termin
-- - Strošek se zaračuna enkrat na termin, ne glede na trajanje
--
-- PRISOTNOST TRENERJEV:
-- - Sistem beleži prisotnost trenerjev za vsak trening
-- - Iz term_status se izračuna število načrtovanih in aktivnih treningov
-- - To se uporablja za izračun stroškov prog in trenerjev
-- - Stroški trenerjev se računajo na podlagi števila terminov, ne ur
--
-- STRUKTURA PODATKOV:
-- - Plavalci so povezani s termini preko JSON polja 'terms' v tabeli 'swimmers'
-- - Trenerji so povezani s termini preko tabele 'trainer_terms'
-- - Prisotnost se beleži v tabelah 'attendance' in 'trainer_attendance'
--
-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se tabele ustvarile
-- 3. Nastavi stroške prog po terminih v admin panelu
-- 4. Nastavi postavko za vsakega trenerja (na termin)
-- 5. Testiraj funkcionalnost v admin panelu
-- 6. Opomba: Stroški prog se računajo na podlagi števila načrtovanih in aktivnih treningov × trajanje v urah × urni strošek
-- 7. Opomba: Stroški trenerjev se računajo na podlagi števila terminov × postavko na termin
