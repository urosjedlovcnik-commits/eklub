-- ===== POPRAVEK MONTH CONSTRAINT IN OBNOVA VADNIN ZA DECEMBER =====
-- Ta skript popravi constraint za month polje in obnovi vadnine za december

-- 1. PREVERI TRENUTNI CONSTRAINT ZA MONTH
SELECT 
    'Trenutni constraint za month' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'swimmer_monthly_fees'::regclass
AND contype = 'c'
AND conname LIKE '%month%';

-- 2. PREVERI OBSTOJEČE VADNINE - ali uporabljajo 0-based ali 1-based mesece
SELECT 
    'Obstajoče vadnine' as info,
    MIN(month) as min_month,
    MAX(month) as max_month,
    COUNT(CASE WHEN month >= 0 AND month <= 11 THEN 1 END) as vadnin_0_based,
    COUNT(CASE WHEN month >= 1 AND month <= 12 THEN 1 END) as vadnin_1_based,
    COUNT(*) as skupaj
FROM swimmer_monthly_fees;

-- 3. PREVERI VADNINE ZA DECEMBER
SELECT 
    'Vadnine za december' as info,
    year,
    COUNT(*) as stevilo_vadnin,
    MIN(month) as min_month,
    MAX(month) as max_month
FROM swimmer_monthly_fees
WHERE month = 12 OR month = 11
GROUP BY year
ORDER BY year;

-- 4. ČE SO VADNINE V 0-based FORMATU, JIH PREPIŠI NA 1-based
-- ODKOMENTIRAJ SAMO ČE ŽELIŠ POPRAVITI OBSTOJEČE PODATKE
/*
UPDATE swimmer_monthly_fees 
SET month = month + 1
WHERE month >= 0 AND month <= 11;
*/

-- 5. ODSTRANI STARI CONSTRAINT (ČE OBSTAJA)
DO $$
BEGIN
    -- Odstrani vse month constraint-e
    ALTER TABLE swimmer_monthly_fees DROP CONSTRAINT IF EXISTS swimmer_monthly_fees_month_check;
    RAISE NOTICE 'Odstranjen stari constraint za month';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Napaka pri odstranjevanju constraint-a: %', SQLERRM;
END $$;

-- 6. DODAJ NOVI CONSTRAINT ZA 1-based MESECE (1-12)
DO $$
BEGIN
    ALTER TABLE swimmer_monthly_fees 
    ADD CONSTRAINT swimmer_monthly_fees_month_check 
    CHECK (month >= 1 AND month <= 12);
    RAISE NOTICE 'Dodan nov constraint za month (1-12)';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Napaka pri dodajanju constraint-a: %', SQLERRM;
END $$;

-- 7. PREVERI REZULTAT
SELECT 
    'Po popravku - constraint' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'swimmer_monthly_fees'::regclass
AND contype = 'c'
AND conname LIKE '%month%';

-- 8. PREVERI OBSTOJEČE VADNINE PO MESECIH
SELECT 
    month as mesec,
    year as leto,
    COUNT(*) as stevilo_vadnin,
    CASE month
        WHEN 1 THEN 'Januar'
        WHEN 2 THEN 'Februar'
        WHEN 3 THEN 'Marec'
        WHEN 4 THEN 'April'
        WHEN 5 THEN 'Maj'
        WHEN 6 THEN 'Junij'
        WHEN 7 THEN 'Julij'
        WHEN 8 THEN 'Avgust'
        WHEN 9 THEN 'September'
        WHEN 10 THEN 'Oktober'
        WHEN 11 THEN 'November'
        WHEN 12 THEN 'December'
        ELSE 'NAPACEN'
    END as mesec_ime
FROM swimmer_monthly_fees
GROUP BY month, year
ORDER BY year, month;

