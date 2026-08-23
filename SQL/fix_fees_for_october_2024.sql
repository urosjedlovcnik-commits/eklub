-- ===== PREVERJANJE IN POPRAVEK VADNIN ZA OKTOBER =====
-- Ta skript preveri, kako so vadnine shranjene in jih popravi če je potrebno

-- 1. PREVERI VADNINE ZA OKTOBER 2024
SELECT 
    'Oktober 2024' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 10 AND year = 2024;

-- 1b. PREVERI VADNINE ZA OKTOBER 2025
SELECT 
    'Oktober 2025' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 10 AND year = 2025;

-- 2. PREVERI VADNINE ZA NOVEMBER 2024 IN 2025
SELECT 
    'November 2024' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 11 AND year = 2024
UNION ALL
SELECT 
    'November 2025' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 11 AND year = 2025;

-- 3. PREVERI VADNINE ZA DECEMBER 2024 IN 2025
SELECT 
    'December 2024' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 12 AND year = 2024
UNION ALL
SELECT 
    'December 2025' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    AVG(monthly_fee) as povprecna_vadnina
FROM swimmer_monthly_fees 
WHERE month = 12 AND year = 2025;

-- 4. PREVERI VSE VADNINE ZA LETI 2024 IN 2025 PO MESECIH
SELECT 
    year as leto,
    month as mesec,
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
    END as mesec_ime,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees
WHERE year IN (2024, 2025)
GROUP BY year, month
ORDER BY year, month;

-- 5. PREVERI, ALI SO VADNINE ZA OKTOBER 2025 SHRNJENE V DECEMBER 2025
-- Če so vadnine za oktober manjkajoče, vendar obstajajo za december z podobnimi zneski,
-- potem so verjetno bile shranjene za napačen mesec
SELECT 
    smf_december.swimmer_id,
    s.first_name,
    s.last_name,
    smf_december.month as december_month,
    smf_december.monthly_fee as december_fee,
    smf_december.discount as december_discount,
    smf_oktober.month as oktober_month,
    smf_oktober.monthly_fee as oktober_fee,
    CASE 
        WHEN smf_oktober.id IS NULL THEN 'MANJKA OKTOBER'
        ELSE 'OBSTAJA OKTOBER'
    END as status
FROM swimmer_monthly_fees smf_december
JOIN swimmers s ON smf_december.swimmer_id = s.id
LEFT JOIN swimmer_monthly_fees smf_oktober 
    ON smf_oktober.swimmer_id = smf_december.swimmer_id 
    AND smf_oktober.month = 10 
    AND smf_oktober.year = 2025
WHERE smf_december.month = 12 
AND smf_december.year = 2025
AND s.is_deleted = false
ORDER BY s.last_name, s.first_name
LIMIT 30;

-- 6. PREVERI, KATERI PLAVALCI IMAJO VADNINE ZA DECEMBER 2025, VENDAR NE ZA OKTOBER 2025
-- To nam bo pokazalo, kateri plavalci potrebujejo vadnine za oktober
SELECT 
    COUNT(DISTINCT df.swimmer_id) as plavalci_brez_oktobra
FROM swimmer_monthly_fees df
WHERE df.month = 12 
AND df.year = 2025
AND NOT EXISTS (
    SELECT 1 
    FROM swimmer_monthly_fees smf
    WHERE smf.swimmer_id = df.swimmer_id
    AND smf.month = 10
    AND smf.year = 2025
);

-- 7. ČE SO VADNINE ZA OKTOBER 2025 SHRNJENE V DECEMBER 2025, JIH PREPIŠI NA OKTOBER
-- ODKOMENTIRAJ SAMO ČE ŽELIŠ POPRAVITI PODATKE
-- OPOZORILO: To bo kopiralo vadnine iz decembra v oktober za plavalce, ki nimajo vadnin za oktober
/*
WITH december_2025_fees AS (
    SELECT swimmer_id, monthly_fee, discount, COALESCE(is_oly, false) as is_oly
    FROM swimmer_monthly_fees
    WHERE month = 12 AND year = 2025
),
missing_oktober_2025 AS (
    SELECT df.swimmer_id, df.monthly_fee, df.discount, df.is_oly
    FROM december_2025_fees df
    WHERE NOT EXISTS (
        SELECT 1 
        FROM swimmer_monthly_fees smf
        WHERE smf.swimmer_id = df.swimmer_id
        AND smf.month = 10
        AND smf.year = 2025
    )
)
INSERT INTO swimmer_monthly_fees (swimmer_id, month, year, monthly_fee, discount, is_oly)
SELECT 
    swimmer_id,
    10 as month, -- Oktober
    2025 as year,
    monthly_fee,
    discount,
    is_oly
FROM missing_oktober_2025
ON CONFLICT (swimmer_id, month, year) DO UPDATE
SET 
    monthly_fee = EXCLUDED.monthly_fee,
    discount = EXCLUDED.discount,
    is_oly = EXCLUDED.is_oly;
*/

-- 8. ALTERNATIVNO: ČE SO VADNINE ZA OKTOBER 2025 SHRNJENE V NOVEMBER 2025, JIH PREPIŠI
-- ODKOMENTIRAJ SAMO ČE ŽELIŠ POPRAVITI PODATKE
/*
WITH november_2025_fees AS (
    SELECT swimmer_id, monthly_fee, discount, COALESCE(is_oly, false) as is_oly
    FROM swimmer_monthly_fees
    WHERE month = 11 AND year = 2025
),
missing_oktober_2025 AS (
    SELECT nf.swimmer_id, nf.monthly_fee, nf.discount, nf.is_oly
    FROM november_2025_fees nf
    WHERE NOT EXISTS (
        SELECT 1 
        FROM swimmer_monthly_fees smf
        WHERE smf.swimmer_id = nf.swimmer_id
        AND smf.month = 10
        AND smf.year = 2025
    )
)
INSERT INTO swimmer_monthly_fees (swimmer_id, month, year, monthly_fee, discount, is_oly)
SELECT 
    swimmer_id,
    10 as month, -- Oktober
    2025 as year,
    monthly_fee,
    discount,
    is_oly
FROM missing_oktober_2025
ON CONFLICT (swimmer_id, month, year) DO UPDATE
SET 
    monthly_fee = EXCLUDED.monthly_fee,
    discount = EXCLUDED.discount,
    is_oly = EXCLUDED.is_oly;
*/

-- 9. PREVERI REZULTAT PO POPRAVKU
SELECT 
    'Po popravku - Oktober 2024' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE month = 10 AND year = 2024
UNION ALL
SELECT 
    'Po popravku - Oktober 2025' as mesec,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE month = 10 AND year = 2025;

