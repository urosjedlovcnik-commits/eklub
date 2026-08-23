-- ===== DODAJANJE EMAIL NASLOVOV IN TELEFONSKIH ŠTEVILK PLVALCEM =====
-- Ta skript doda stolpca email in phone v tabelo swimmers

-- 1. DODAJ STOLPEC EMAIL V TABELO SWIMMERS
DO $$ 
BEGIN
    -- Preveri, če stolpec email že obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'email'
        AND table_schema = 'public'
    ) THEN
        -- Dodaj stolpec email
        ALTER TABLE "public"."swimmers" ADD COLUMN "email" TEXT;
        RAISE NOTICE 'Stolpec email je bil dodan v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec email že obstaja v tabeli swimmers';
    END IF;
END $$;

-- 2. DODAJ STOLPEC PHONE V TABELO SWIMMERS
DO $$ 
BEGIN
    -- Preveri, če stolpec phone že obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'phone'
        AND table_schema = 'public'
    ) THEN
        -- Dodaj stolpec phone
        ALTER TABLE "public"."swimmers" ADD COLUMN "phone" TEXT;
        RAISE NOTICE 'Stolpec phone je bil dodan v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec phone že obstaja v tabeli swimmers';
    END IF;
END $$;

-- 3. DODAJ INDEKS ZA EMAIL (za hitrejše iskanje)
CREATE INDEX IF NOT EXISTS idx_swimmers_email ON "public"."swimmers"("email");

-- 4. DODAJ INDEKS ZA PHONE (za hitrejše iskanje)
CREATE INDEX IF NOT EXISTS idx_swimmers_phone ON "public"."swimmers"("phone");

-- 5. DODAJ UNIQUE CONSTRAINT ZA EMAIL (opcijsko - če želimo, da so email naslovi enolični)
-- Če želite, da so email naslovi enolični, odkomentirajte naslednjo vrstico:
-- ALTER TABLE "public"."swimmers" ADD CONSTRAINT unique_swimmer_email UNIQUE("email");

-- 6. PREVERI STRUKTURO TABELE
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'swimmers'
ORDER BY ordinal_position;

-- 7. PREVERI OBSTOJEČE PODATKE
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    is_deleted
FROM "public"."swimmers"
WHERE is_deleted = false
ORDER BY first_name, last_name;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da se sta stolpca email in phone dodala
-- 3. Posodobi admin.js za podporo email naslovov in telefonskih številk
-- 4. Testiraj dodajanje novih plavalcev z email naslovi in telefonskimi številkami
-- 5. Opomba: Email naslovi in telefonske številke so opcijski (nullable)
