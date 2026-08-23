-- ===== VARNOSTNO USTVARJANJE VADNIN ZA LETO 2026 =====
-- Ta skript varno ustvari vadnine za leto 2026, če ne obstajajo

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

-- 3. PREVERI, KATERE VADNINE ZA 2026 MANJKAJO
WITH december_2025_fees AS (
    SELECT DISTINCT swimmer_id, monthly_fee
    FROM swimmer_monthly_fees 
    WHERE month = 12 AND year = 2025
),
missing_fees AS (
    SELECT 
        d.swimmer_id,
        d.monthly_fee,
        m.month
    FROM december_2025_fees d
    CROSS JOIN generate_series(1, 12) AS m(month)
    WHERE NOT EXISTS (
        SELECT 1 FROM swimmer_monthly_fees existing
        WHERE existing.swimmer_id = d.swimmer_id
        AND existing.month = m.month
        AND existing.year = 2026
    )
)
SELECT 
    'Manjkajoče vadnine za 2026' as info,
    COUNT(*) as stevilo_manjkajocih_vadnin
FROM missing_fees;

-- 4. USTVARI SAMO MANJKAJOČE VADNINE ZA 2026
WITH december_2025_fees AS (
    SELECT DISTINCT swimmer_id, monthly_fee
    FROM swimmer_monthly_fees 
    WHERE month = 12 AND year = 2025
),
missing_fees AS (
    SELECT 
        d.swimmer_id,
        d.monthly_fee,
        m.month
    FROM december_2025_fees d
    CROSS JOIN generate_series(1, 12) AS m(month)
    WHERE NOT EXISTS (
        SELECT 1 FROM swimmer_monthly_fees existing
        WHERE existing.swimmer_id = d.swimmer_id
        AND existing.month = m.month
        AND existing.year = 2026
    )
)
INSERT INTO swimmer_monthly_fees (swimmer_id, month, year, monthly_fee, discount)
SELECT 
    swimmer_id,
    month,
    2026 as year,
    monthly_fee,
    0 as discount
FROM missing_fees;

-- 5. PREVERI REZULTAT
SELECT 
    'Po ustvarjanju - Leto 2026' as obdobje,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE year = 2026;

-- 6. PREVERI, ALI SO VADNINE PRAVILNO USTVARJENE
SELECT 
    month as mesec,
    COUNT(*) as stevilo_vadnin,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE year = 2026
GROUP BY month
ORDER BY month;

-- 7. PRIKAŽI PRIMERNE VADNINE ZA 2026
SELECT 
    s.first_name,
    s.last_name,
    smf.month as mesec,
    smf.monthly_fee,
    smf.discount
FROM swimmer_monthly_fees smf
JOIN swimmers s ON smf.swimmer_id = s.id
WHERE smf.year = 2026
AND s.is_deleted = false
ORDER BY s.first_name, s.last_name, smf.month
LIMIT 20;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se vadnine ustvarile samo za manjkajoče mesece
-- 3. Preveri, da so vadnine pravilno kopirane iz decembra 2025
-- 4. Testiraj admin aplikacijo - vadnine za 2026 bi se morale prikazati
