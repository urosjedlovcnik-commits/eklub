-- ===== USTVARJANJE VADNIN ZA LETO 2026 =====
-- Ta skript ustvari vadnine za celo leto 2026 na podlagi vadnin iz decembra 2025

-- 1. PREVERI OBSTOJEČE VADNINE ZA DECEMBER 2025
SELECT 
    'December 2025' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE month = 12 AND year = 2025;

-- 2. PREVERI OBSTOJEČE VADNINE ZA LETO 2026
SELECT 
    'Leto 2026' as obdobje,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE year = 2026;

-- 3. USTVARI VADNINE ZA VSE MESECE 2026 (samo če ne obstajajo)
INSERT INTO swimmer_monthly_fees (swimmer_id, month, year, monthly_fee, discount)
SELECT 
    swimmer_id,
    month_2026,
    2026 as year,
    monthly_fee,
    0 as discount -- Brez popusta za nove mesece
FROM (
    SELECT 
        swimmer_id,
        monthly_fee,
        generate_series(1, 12) as month_2026
    FROM swimmer_monthly_fees 
    WHERE month = 12 AND year = 2025
) AS december_fees
WHERE NOT EXISTS (
    SELECT 1 FROM swimmer_monthly_fees existing
    WHERE existing.swimmer_id = december_fees.swimmer_id
    AND existing.month = month_2026
    AND existing.year = 2026
)
ON CONFLICT (swimmer_id, month, year) DO NOTHING;

-- 4. PREVERI REZULTAT
SELECT 
    'Po ustvarjanju - Leto 2026' as obdobje,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE year = 2026;

-- 5. PRIKAŽI PRIMERNE VADNINE ZA 2026
SELECT 
    s.first_name,
    s.last_name,
    smf.month + 1 as mesec,
    smf.monthly_fee,
    smf.discount
FROM swimmer_monthly_fees smf
JOIN swimmers s ON smf.swimmer_id = s.id
WHERE smf.year = 2026
AND s.is_deleted = false
ORDER BY s.first_name, s.last_name, smf.month
LIMIT 20;

-- 6. PREVERI, ALI SO VADNINE PRAVILNO USTVARJENE
SELECT 
    month as mesec,
    COUNT(*) as stevilo_vadnin,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE year = 2026
GROUP BY month
ORDER BY month;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se vadnine ustvarile za vse mesece 2026
-- 3. Preveri, da so vadnine pravilno kopirane iz decembra 2025
-- 4. Testiraj admin aplikacijo - vadnine za 2026 bi se morale prikazati
