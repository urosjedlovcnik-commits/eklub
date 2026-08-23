-- ===== POPRAVEK MESEC CONSTRAINT NAPAK =====
-- Ta skript popravi vadnine, ki imajo napačne mesece (0-based namesto 1-based)

-- 1. PREVERI OBSTOJEČE VADNINE Z NAPAČNIMI MESECI
SELECT 
    'Vadnine z napačnimi meseci' as problem,
    COUNT(*) as stevilo_vadnin
FROM swimmer_monthly_fees 
WHERE month < 1 OR month > 12;

-- 2. PREVERI VADNINE Z MESECI 0-11 (0-based)
SELECT 
    'Vadnine z 0-based meseci' as problem,
    COUNT(*) as stevilo_vadnin
FROM swimmer_monthly_fees 
WHERE month >= 0 AND month <= 11;

-- 3. PREVERI VADNINE Z MESECI 1-12 (1-based)
SELECT 
    'Vadnine z 1-based meseci' as problem,
    COUNT(*) as stevilo_vadnin
FROM swimmer_monthly_fees 
WHERE month >= 1 AND month <= 12;

-- 4. POPRAVI VADNINE Z 0-BASED MESECI NA 1-BASED
UPDATE swimmer_monthly_fees 
SET month = month + 1
WHERE month >= 0 AND month <= 11;

-- 5. PREVERI REZULTAT
SELECT 
    'Po popravku - vadnine z 1-based meseci' as problem,
    COUNT(*) as stevilo_vadnin
FROM swimmer_monthly_fees 
WHERE month >= 1 AND month <= 12;

-- 6. PREVERI, ALI SO VSI MESECI PRAVILNI
SELECT 
    'Vadnine z napačnimi meseci po popravku' as problem,
    COUNT(*) as stevilo_vadnin
FROM swimmer_monthly_fees 
WHERE month < 1 OR month > 12;

-- 7. PRIKAŽI PRIMERNE VADNINE PO MESECIH
SELECT 
    month as mesec,
    year as leto,
    COUNT(*) as stevilo_vadnin,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
GROUP BY month, year
ORDER BY year, month;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se vadnine popravile
-- 3. Preveri, da so vsi meseci v obsegu 1-12
-- 4. Testiraj ustvarjanje vadnin za 2026
