-- ============================================================
-- SKRIPTA ZA DEJANSKO OBNOVITEV PRISOTNOSTI
-- ============================================================
-- POZOR: Ta skripta dejansko izvaja INSERT stavke!
-- Preverite rezultate PRED izvedbo!

-- ============================================================
-- KORAK 1: Preveri trenutno stanje
-- ============================================================
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT 
    COUNT(*) AS obstojeci_zapisi,
    MIN(date) AS prvi_datum,
    MAX(date) AS zadnji_datum
FROM attendance a
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15-07:30'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date;

-- ============================================================
-- KORAK 2: Preveri, ali podatki obstajajo pod DRUGIM term_id
-- (npr. če se je termin spremenil, podatki morda obstajajo pod starim ID-jem)
-- ============================================================
-- Pomembno: Preveri oba formata - z sekundami in brez sekund!
-- V bazi morda obstaja: tor-06:15:00-07:30:00 ali tor-06:15-07:30

-- Preveri za oba formata ID-ja
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT 
    'tor-06:15-07:30 (brez sekund)' AS format_id,
    COUNT(*) as st_zapisov
FROM attendance a
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15-07:30'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date

UNION ALL

SELECT 
    'tor-06:15:00-07:30:00 (s sekundami)' AS format_id,
    COUNT(*) as st_zapisov
FROM attendance a
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15:00-07:30:00'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date

UNION ALL

-- Poišči vse termine, ki se začnejo z "tor-" in imajo podoben čas
SELECT 
    'Drugi termini (tor-XX:XX)' AS format_id,
    COUNT(*) as st_zapisov
FROM attendance a
LEFT JOIN terms t ON a.term_id = t.id
CROSS JOIN previous_month pm
WHERE a.date >= pm.start_date
  AND a.date <= pm.end_date
  AND a.term_id LIKE 'tor-%'
  AND a.term_id NOT IN ('tor-06:15-07:30', 'tor-06:15:00-07:30:00')
  AND (
    -- Poišči termine, ki so torki z urami okoli 06:15-07:30
    a.term_id LIKE 'tor-06:1%'
    OR a.term_id LIKE 'tor-07:0%'
    OR (t.day = 2 AND t.start_time >= '06:00' AND t.start_time <= '07:30')
  )
GROUP BY format_id
ORDER BY st_zapisov DESC;

-- Prikaži tudi vse term_id, ki se začnejo z "tor-" za prejšnji mesec
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT DISTINCT
    a.term_id,
    t.start_time,
    t.end_time,
    COUNT(*) as st_zapisov,
    MIN(a.date) as prvi_datum,
    MAX(a.date) as zadnji_datum
FROM attendance a
LEFT JOIN terms t ON a.term_id = t.id
CROSS JOIN previous_month pm
WHERE a.date >= pm.start_date
  AND a.date <= pm.end_date
  AND a.term_id LIKE 'tor-%'
GROUP BY a.term_id, t.start_time, t.end_time
ORDER BY st_zapisov DESC;

-- ============================================================
-- KORAK 3: OBNOVI PRISOTNOST IZ DRUGEGA TERMINA
-- (če so podatki pod drugim term_id, jih prestavi na pravilni)
-- ============================================================
-- POZOR: Odkomentirajte le, če ste našli podatke pod drugim term_id!

-- OPCIJA 3A: Če so podatki pod 'tor-06:15:00-07:30:00' (s sekundami)
-- UPDATE attendance
-- SET term_id = 'tor-06:15-07:30'
-- WHERE term_id = 'tor-06:15:00-07:30:00'
--   AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
--   AND date <= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day');

-- OPCIJA 3B: Če so podatki pod drugim term_id (zamenjajte 'STARI_TERM_ID')
-- UPDATE attendance
-- SET term_id = 'tor-06:15-07:30'
-- WHERE term_id = 'STARI_TERM_ID'  -- Zamenjajte s pravim starim term_id iz KORAKA 2!
--   AND date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
--   AND date <= (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day');

-- ============================================================
-- KORAK 4: Ustvari INSERT stavke za vse torke v prejšnjem mesecu
-- (To je TEMPORARY rešitev - nastavi vse na 'present')
-- ============================================================
-- POZOR: To ustvari podatke z default statusom 'present'!
-- Če imate backup, uporabite korak 5 namesto tega!

-- Preveri, koliko zapisov bi bilo vstavljenih (pred izvedbo INSERT)
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS start_date,
        (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::date AS end_date
),
all_dates_in_month AS (
    SELECT generate_series(
        pm.start_date,
        pm.end_date,
        '1 day'::interval
    )::date AS date_value
    FROM previous_month pm
),
tuesdays_in_month AS (
    SELECT date_value AS tuesday_date
    FROM all_dates_in_month
    WHERE EXTRACT(DOW FROM date_value) = 2  -- 2 = Tuesday
),
swimmers_with_term AS (
    SELECT s.id AS swimmer_id
    FROM swimmers s
    WHERE 'tor-06:15-07:30' = ANY(s.terms)
      AND s.is_deleted = false
),
records_to_insert AS (
    SELECT 
        t.tuesday_date AS date,
        'tor-06:15-07:30'::text AS term_id,
        s.swimmer_id,
        'present'::text AS status
    FROM tuesdays_in_month t
    CROSS JOIN swimmers_with_term s
    WHERE NOT EXISTS (
        SELECT 1 
        FROM attendance a 
        WHERE a.date = t.tuesday_date
          AND a.term_id = 'tor-06:15-07:30'
          AND a.swimmer_id = s.swimmer_id
    )
)
SELECT COUNT(*) as zapisov_za_vstavljanje
FROM records_to_insert;

-- Prikaži, katere zapise bi vstavili
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS start_date,
        (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::date AS end_date
),
all_dates_in_month AS (
    SELECT generate_series(
        pm.start_date,
        pm.end_date,
        '1 day'::interval
    )::date AS date_value
    FROM previous_month pm
),
tuesdays_in_month AS (
    SELECT date_value AS tuesday_date
    FROM all_dates_in_month
    WHERE EXTRACT(DOW FROM date_value) = 2  -- 2 = Tuesday
),
swimmers_with_term AS (
    SELECT s.id AS swimmer_id
    FROM swimmers s
    WHERE 'tor-06:15-07:30' = ANY(s.terms)
      AND s.is_deleted = false
),
records_to_insert AS (
    SELECT 
        t.tuesday_date AS date,
        'tor-06:15-07:30'::text AS term_id,
        s.swimmer_id,
        'present'::text AS status
    FROM tuesdays_in_month t
    CROSS JOIN swimmers_with_term s
    WHERE NOT EXISTS (
        SELECT 1 
        FROM attendance a 
        WHERE a.date = t.tuesday_date
          AND a.term_id = 'tor-06:15-07:30'
          AND a.swimmer_id = s.swimmer_id
    )
)
SELECT * FROM records_to_insert ORDER BY date, swimmer_id;

-- POŽENITE TO LE, ČE STE PREPRIČANI IN ŽELITE DEJANSKO VSTAVITI PODATKE!
-- INSERT INTO attendance (date, term_id, swimmer_id, status)
-- WITH previous_month AS (
--     SELECT 
--         DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')::date AS start_date,
--         (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day')::date AS end_date
-- ),
-- all_dates_in_month AS (
--     SELECT generate_series(
--         pm.start_date,
--         pm.end_date,
--         '1 day'::interval
--     )::date AS date_value
--     FROM previous_month pm
-- ),
-- tuesdays_in_month AS (
--     SELECT date_value AS tuesday_date
--     FROM all_dates_in_month
--     WHERE EXTRACT(DOW FROM date_value) = 2  -- 2 = Tuesday
-- ),
-- swimmers_with_term AS (
--     SELECT s.id AS swimmer_id
--     FROM swimmers s
--     WHERE 'tor-06:15-07:30' = ANY(s.terms)
--       AND s.is_deleted = false
-- )
-- SELECT 
--     t.tuesday_date AS date,
--     'tor-06:15-07:30'::text AS term_id,
--     s.swimmer_id,
--     'present'::text AS status
-- FROM tuesdays_in_month t
-- CROSS JOIN swimmers_with_term s
-- WHERE NOT EXISTS (
--     SELECT 1 
--     FROM attendance a 
--     WHERE a.date = t.tuesday_date
--       AND a.term_id = 'tor-06:15-07:30'
--       AND a.swimmer_id = s.swimmer_id
-- )
-- ON CONFLICT (date, term_id, swimmer_id) DO NOTHING;

-- ============================================================
-- KORAK 5: Uvoz iz CSV ali backup podatkov
-- ============================================================
-- Če imate backup podatkov, jih uvozite z:
--
-- INSERT INTO attendance (date, term_id, swimmer_id, status)
-- VALUES
--     ('2024-11-05', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'present'),
--     ('2024-11-12', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'present'),
--     ...
-- ON CONFLICT (date, term_id, swimmer_id) DO UPDATE 
-- SET status = EXCLUDED.status;

-- ============================================================
-- KORAK 6: Preveri, ali Supabase podpira Point-in-Time Recovery
-- ============================================================
-- 1. Odprite Supabase Dashboard
-- 2. Pojdite na "Database" → "Backups"
-- 3. Preverite, ali je na voljo Point-in-Time Recovery
-- 4. Če je, izberite točko v času PRED izgubo podatkov
-- 5. Izvozite attendance tabelo:
--
-- SELECT * FROM attendance
-- WHERE term_id = 'tor-06:15-07:30'
--   AND date >= '2024-11-01'
--   AND date <= '2024-11-30';
--
-- 6. Uvozite rezultate nazaj v trenutno bazo

-- ============================================================
-- KONČNA PREVERITEV
-- ============================================================
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT 
    'KONČNO STANJE' AS opis,
    COUNT(*) AS skupno_zapisov,
    COUNT(DISTINCT date) AS st_datuma,
    COUNT(DISTINCT swimmer_id) AS st_plavalcev,
    MIN(date) AS prvi_datum,
    MAX(date) AS zadnji_datum
FROM attendance a
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15-07:30'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date;

