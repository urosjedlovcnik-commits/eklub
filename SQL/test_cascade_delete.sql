-- ===== TEST KASKADNEGA BRISANJA PLAVALCA =====
-- Ta skript testira kaskadno brisanje plavalca

-- 1. PREVERI OBSTOJEČE PODATKE
SELECT 'Obstoječi podatki pred testom:' as info;

SELECT 
    'Plavalci' as tabela,
    COUNT(*) as skupno,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as aktivni,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as izbrisani
FROM swimmers;

SELECT 
    'Evidenca prisotnosti' as tabela,
    COUNT(*) as skupno_zapisov
FROM attendance;

SELECT 
    'Mesečne pristojbine' as tabela,
    COUNT(*) as skupno_zapisov
FROM swimmer_monthly_fees;

-- 2. POIŠČI PLAVALCA ZA TEST (prvi aktivni plavalec)
DO $$
DECLARE
    test_swimmer_id UUID;
    test_swimmer_name TEXT;
    attendance_count INTEGER;
    fees_count INTEGER;
BEGIN
    -- Poišči prvega aktivnega plavalca
    SELECT id, first_name || ' ' || last_name INTO test_swimmer_id, test_swimmer_name
    FROM swimmers 
    WHERE is_deleted = false 
    LIMIT 1;
    
    IF test_swimmer_id IS NULL THEN
        RAISE NOTICE 'Ni aktivnih plavalcev za test';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Test plavalec: % (%)', test_swimmer_name, test_swimmer_id;
    
    -- Preveri povezave
    SELECT COUNT(*) INTO attendance_count FROM attendance WHERE swimmer_id = test_swimmer_id;
    SELECT COUNT(*) INTO fees_count FROM swimmer_monthly_fees WHERE swimmer_id = test_swimmer_id;
    
    RAISE NOTICE 'Povezave: % zapisov prisotnosti, % zapisov pristojbin', attendance_count, fees_count;
    
    -- Testiraj funkcijo za preverjanje povezav
    PERFORM check_swimmer_connections(test_swimmer_id);
    
    -- Testiraj kaskadno brisanje
    DECLARE
        delete_result JSON;
    BEGIN
        SELECT delete_swimmer_cascade(test_swimmer_id) INTO delete_result;
        RAISE NOTICE 'Rezultat brisanja: %', delete_result;
    END;
    
    RAISE NOTICE 'Test kaskadnega brisanja končan';
END $$;

-- 3. PREVERI REZULTAT BRISANJA
SELECT 'Rezultat po brisanju:' as info;

SELECT 
    'Plavalci' as tabela,
    COUNT(*) as skupno,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as aktivni,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as izbrisani
FROM swimmers;

SELECT 
    'Evidenca prisotnosti' as tabela,
    COUNT(*) as skupno_zapisov
FROM attendance;

SELECT 
    'Mesečne pristojbine' as tabela,
    COUNT(*) as skupno_zapisov
FROM swimmer_monthly_fees;

-- 4. TEST OBNOVITVE PLAVALCA
DO $$
DECLARE
    test_swimmer_id UUID;
    test_swimmer_name TEXT;
    restore_result JSON;
BEGIN
    -- Poišči prvega izbrisanega plavalca
    SELECT id, first_name || ' ' || last_name INTO test_swimmer_id, test_swimmer_name
    FROM swimmers 
    WHERE is_deleted = true 
    LIMIT 1;
    
    IF test_swimmer_id IS NULL THEN
        RAISE NOTICE 'Ni izbrisanih plavalcev za test obnovitve';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Test obnovitve plavalca: % (%)', test_swimmer_name, test_swimmer_id;
    
    -- Testiraj obnovitev
    DECLARE
        restore_result JSON;
    BEGIN
        SELECT restore_swimmer(test_swimmer_id) INTO restore_result;
        RAISE NOTICE 'Rezultat obnovitve: %', restore_result;
    END;
    
END $$;

-- 5. KONČNO PREVERJANJE
SELECT 'Končno stanje:' as info;

SELECT 
    'Plavalci' as tabela,
    COUNT(*) as skupno,
    COUNT(CASE WHEN is_deleted = false THEN 1 END) as aktivni,
    COUNT(CASE WHEN is_deleted = true THEN 1 END) as izbrisani
FROM swimmers;

-- 6. PRIKAŽI VSE FUNKCIJE
SELECT 'Dostopne funkcije:' as info;
SELECT 
    routine_name as funkcija,
    routine_type as tip,
    data_type as vrni_tip
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%swimmer%'
ORDER BY routine_name;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri rezultate v konzoli
-- 3. Funkcije so pripravljene za uporabo v admin aplikaciji
-- 4. Če test ne deluje, preveri, da so vse funkcije ustvarjene
