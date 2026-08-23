-- ===== PREVERJANJE STRUKTURE TABELE SWIMMERS =====
-- Ta skript preveri strukturo tabele swimmers in doda potrebne stolpce

-- 1. PREVERI OBSTOJEČE STOLPCE
SELECT 
    'Obstoječi stolpci v tabeli swimmers:' as info;

SELECT 
    column_name as stolpec,
    data_type as tip_podatka,
    is_nullable as lahko_null,
    column_default as privzeta_vrednost
FROM information_schema.columns 
WHERE table_name = 'swimmers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. DODAJ STOLPEC is_deleted, ČE NE OBSTAJA
DO $$ 
BEGIN
    -- Dodaj stolpec is_deleted, če ne obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'is_deleted'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."swimmers" ADD COLUMN "is_deleted" BOOLEAN DEFAULT false;
        RAISE NOTICE 'Stolpec is_deleted je bil dodan v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec is_deleted že obstaja v tabeli swimmers';
    END IF;
    
    -- Dodaj stolpec updated_at, če ne obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE "public"."swimmers" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Stolpec updated_at je bil dodan v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec updated_at že obstaja v tabeli swimmers';
    END IF;
END $$;

-- 3. PREVERI KONČNO STANJE
SELECT 
    'Končna struktura tabele swimmers:' as info;

SELECT 
    column_name as stolpec,
    data_type as tip_podatka,
    is_nullable as lahko_null,
    column_default as privzeta_vrednost
FROM information_schema.columns 
WHERE table_name = 'swimmers' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. PREVERI PODATKE
SELECT 
    'Podatki v tabeli swimmers:' as info,
    COUNT(*) as skupno_plavalcev,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as aktivni_plavalci,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as izbrisani_plavalci
FROM swimmers;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se dodali potrebni stolpci
-- 3. Nato zaženi cascade_delete_swimmer.sql
