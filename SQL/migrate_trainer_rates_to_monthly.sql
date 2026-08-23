-- ===== MIGRACIJA TRAINER_RATES TABELE ZA MESEČNE POSTAVKE =====
-- Ta skript spremeni tabelo trainer_rates, da podpira mesečne postavke

-- 1. PREVERI OBSTOJEČO STRUKTURO
DO $$ 
BEGIN
    -- Preveri, če stolpca month in year že obstajata
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_rates' 
        AND column_name = 'month'
    ) THEN
        -- Dodaj stolpca month in year
        ALTER TABLE "public"."trainer_rates" 
        ADD COLUMN "month" INTEGER,
        ADD COLUMN "year" INTEGER;
        
        RAISE NOTICE 'Stolpca month in year sta bila dodana';
    ELSE
        RAISE NOTICE 'Stolpca month in year že obstajata';
    END IF;
END $$;

-- 2. MIGRIRAJ OBSTOJEČE PODATKE (dodeli jim trenutni mesec in leto)
DO $$
DECLARE
    current_month INTEGER;
    current_year INTEGER;
BEGIN
    current_month := EXTRACT(MONTH FROM NOW());
    current_year := EXTRACT(YEAR FROM NOW());
    
    -- Posodobi obstoječe zapise, ki nimajo meseca in leta
    UPDATE "public"."trainer_rates"
    SET 
        "month" = current_month,
        "year" = current_year
    WHERE "month" IS NULL OR "year" IS NULL;
    
    RAISE NOTICE 'Obstoječi podatki so bili migrirani za mesec % in leto %', current_month, current_year;
END $$;

-- 3. DODAJ CHECK CONSTRAINTS
DO $$
BEGIN
    -- Dodaj CHECK constraint za month, če ne obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_rates_month_check'
        AND table_name = 'trainer_rates'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        ADD CONSTRAINT "trainer_rates_month_check" 
        CHECK (month >= 1 AND month <= 12);
        
        RAISE NOTICE 'CHECK constraint za month je bil dodan';
    END IF;
    
    -- Dodaj CHECK constraint za year, če ne obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_rates_year_check'
        AND table_name = 'trainer_rates'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        ADD CONSTRAINT "trainer_rates_year_check" 
        CHECK (year >= 2000 AND year <= 2100);
        
        RAISE NOTICE 'CHECK constraint za year je bil dodan';
    END IF;
END $$;

-- 4. NASTAVI NOT NULL ZA month IN year (po migraciji)
DO $$
BEGIN
    -- Nastavi NOT NULL za month, če še ni
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_rates' 
        AND column_name = 'month'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        ALTER COLUMN "month" SET NOT NULL;
        
        RAISE NOTICE 'Stolpec month je bil nastavljen na NOT NULL';
    END IF;
    
    -- Nastavi NOT NULL za year, če še ni
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trainer_rates' 
        AND column_name = 'year'
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        ALTER COLUMN "year" SET NOT NULL;
        
        RAISE NOTICE 'Stolpec year je bil nastavljen na NOT NULL';
    END IF;
END $$;

-- 5. ODSTRANI STAR UNIQUE CONSTRAINT IN DODAJ NOVEGA
DO $$
BEGIN
    -- Odstrani stari UNIQUE constraint (če obstaja)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_rates_trainer_id_key'
        AND table_name = 'trainer_rates'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        DROP CONSTRAINT "trainer_rates_trainer_id_key";
        
        RAISE NOTICE 'Stari UNIQUE constraint je bil odstranjen';
    END IF;
    
    -- Dodaj nov UNIQUE constraint za (trainer_id, month, year)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trainer_rates_trainer_id_month_year_key'
        AND table_name = 'trainer_rates'
    ) THEN
        ALTER TABLE "public"."trainer_rates"
        ADD CONSTRAINT "trainer_rates_trainer_id_month_year_key" 
        UNIQUE ("trainer_id", "month", "year");
        
        RAISE NOTICE 'Nov UNIQUE constraint (trainer_id, month, year) je bil dodan';
    END IF;
END $$;

-- 6. PREVERI REZULTAT
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trainer_rates'
ORDER BY ordinal_position;

-- 7. PREVERI CONSTRAINTS
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'trainer_rates';

