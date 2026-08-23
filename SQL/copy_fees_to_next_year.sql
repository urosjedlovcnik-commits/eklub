-- ===== UNIVERZALNO KOPIRANJE VADNIN ZA NASLEDNJE LETO =====
-- Ta skript kopira vadnine iz trenutnega leta v naslednje leto

-- 1. NASTAVI LETO (spremeni po potrebi)
-- Za avtomatsko določitev trenutnega leta uporabi: EXTRACT(YEAR FROM CURRENT_DATE)
DO $$
DECLARE
    current_year INTEGER;
    next_year INTEGER;
BEGIN
    -- Avtomatsko določi trenutno leto
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    next_year := current_year + 1;
    
    RAISE NOTICE 'Trenutno leto: %', current_year;
    RAISE NOTICE 'Naslednje leto: %', next_year;
    
    -- Ustvari vadnine za naslednje leto
    INSERT INTO swimmer_monthly_fees (swimmer_id, month, year, monthly_fee, discount)
    WITH december_fees AS (
        SELECT DISTINCT swimmer_id, monthly_fee
        FROM swimmer_monthly_fees 
        WHERE month = 12 AND year = current_year
    ),
    missing_fees AS (
        SELECT 
            d.swimmer_id,
            d.monthly_fee,
            m.month
        FROM december_fees d
        CROSS JOIN generate_series(1, 12) AS m(month)
        WHERE NOT EXISTS (
            SELECT 1 FROM swimmer_monthly_fees existing
            WHERE existing.swimmer_id = d.swimmer_id
            AND existing.month = m.month
            AND existing.year = next_year
        )
    )
    SELECT 
        swimmer_id,
        month,
        next_year as year,
        monthly_fee,
        0 as discount
    FROM missing_fees
    ON CONFLICT (swimmer_id, month, year) DO NOTHING;
    
    -- Preveri rezultat
    RAISE NOTICE 'Ustvarjenih vadnin za leto %: %', next_year, (
        SELECT COUNT(*) FROM swimmer_monthly_fees WHERE year = next_year
    );
END $$;

-- 2. PREVERI REZULTAT
SELECT 
    'Rezultat kopiranja' as info,
    year as leto,
    COUNT(*) as stevilo_vadnin,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev
FROM swimmer_monthly_fees 
WHERE year IN (EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE) + 1)
GROUP BY year
ORDER BY year;

-- 3. PRIKAŽI PRIMERNE VADNINE ZA NASLEDNJE LETO
SELECT 
    s.first_name,
    s.last_name,
    smf.month as mesec,
    smf.monthly_fee,
    smf.discount
FROM swimmer_monthly_fees smf
JOIN swimmers s ON smf.swimmer_id = s.id
WHERE smf.year = EXTRACT(YEAR FROM CURRENT_DATE) + 1
AND s.is_deleted = false
ORDER BY s.first_name, s.last_name, smf.month
LIMIT 20;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Skript avtomatsko določi trenutno leto in kopira vadnine za naslednje leto
-- 3. Preveri rezultate in testiraj admin aplikacijo
-- 4. Skript je univerzalen - deluje za vsako leto!
