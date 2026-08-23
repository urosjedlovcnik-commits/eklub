-- ============================================================
-- PREVERJANJE PRISOTNOSTI za termin "tor-06:15-07:30" iz prejšnjega meseca
-- ============================================================
-- POZOR: Ta skripta SAMO PREVERJA in prikazuje podatke!
-- Ta skripta NE IZVODI obnove!
-- 
-- Za dejansko obnovitev uporabite:
-- SQL/restore_attendance_tor_06_15_execute.sql
-- ============================================================

-- Preveri, ali termin obstaja
SELECT 
    id,
    day,
    start_time,
    end_time,
    date_from,
    date_to
FROM terms
WHERE id = 'tor-06:15-07:30';

-- Preveri trenutno stanje prisotnosti za prejšnji mesec
-- (PRILEGODITE DATUM - trenutno je nastavljeno na NOVEMBAR 2024)
-- Za december 2024 je prejšnji mesec november 2024

WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT 
    a.date,
    a.term_id,
    a.swimmer_id,
    s.first_name,
    s.last_name,
    a.status
FROM attendance a
LEFT JOIN swimmers s ON a.swimmer_id = s.id
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15-07:30'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date
ORDER BY a.date, s.last_name, s.first_name;

-- Preveri, koliko zapisov obstaja za ta termin in mesec
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
)
SELECT 
    COUNT(*) AS total_records,
    COUNT(DISTINCT date) AS distinct_dates,
    COUNT(DISTINCT swimmer_id) AS distinct_swimmers,
    MIN(date) AS first_date,
    MAX(date) AS last_date
FROM attendance a
CROSS JOIN previous_month pm
WHERE a.term_id = 'tor-06:15-07:30'
  AND a.date >= pm.start_date
  AND a.date <= pm.end_date;

-- ============================================================
-- NAVODILA ZA OBNOVITEV:
-- ============================================================
-- 
-- 1. Če so podatki izbrisani, lahko uporabite Supabase Point-in-Time Recovery:
--    - Odprite Supabase Dashboard
--    - Pojdite na "Database" → "Backups"
--    - Izberite točko v času pred izbrisom
--    - Izvozite attendance tabelo iz te točke
--
-- 2. ALI uporabite ta SQL za vstavljanje zapisov iz backupa:
--    (PRILEGODITE PODATKE - to so samo primeri!)
--
-- INSERT INTO attendance (date, term_id, swimmer_id, status)
-- VALUES
--     ('2024-11-05', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'present'),
--     ('2024-11-12', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'present'),
--     ('2024-11-19', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'absent'),
--     ('2024-11-26', 'tor-06:15-07:30', 'UUID-PLAVALCA-1', 'present')
-- ON CONFLICT (date, term_id, swimmer_id) DO UPDATE 
-- SET status = EXCLUDED.status;
-- 
-- OPOMBA: Če tabela attendance ima stolpca created_at in updated_at, jih lahko dodate:
-- INSERT INTO attendance (date, term_id, swimmer_id, status, created_at, updated_at)
-- VALUES (...)
-- ON CONFLICT (date, term_id, swimmer_id) DO UPDATE 
-- SET status = EXCLUDED.status,
--     updated_at = EXCLUDED.updated_at;
--
-- ============================================================
-- PREVERJANJE PRISOTNOSTI IZ ARHIVIRANEGA BACKUP-a:
-- ============================================================
--
-- Če imate backup v CSV ali SQL formatu, ga lahko uvozite z:
--
-- COPY attendance (date, term_id, swimmer_id, status)
-- FROM '/path/to/backup.csv'
-- WITH (FORMAT csv, HEADER true);
--
-- OPOMBA: Če tabela attendance ima stolpca created_at in updated_at, jih lahko dodate:
-- COPY attendance (date, term_id, swimmer_id, status, created_at, updated_at)
-- FROM '/path/to/backup.csv'
-- WITH (FORMAT csv, HEADER true);
--
-- ============================================================
-- ALTERNATIVNO - OBNOVITEV IZ SUPABASE POINT-IN-TIME RECOVERY:
-- ============================================================
--
-- 1. Odprite Supabase Dashboard
-- 2. Pojdite na "Database" → "Backups"
-- 3. Izberite točko v času pred izgubo podatkov
-- 4. Kliknite "Restore" ali "Query" za ta čas
-- 5. Poženite ta query za izvoz:
--
-- SELECT * FROM attendance
-- WHERE term_id = 'tor-06:15-07:30'
--   AND date >= '2024-11-01'
--   AND date <= '2024-11-30';
--
-- 6. Rezultate shranite in jih uvozite nazaj v trenutno bazo

-- ============================================================
-- POIZVEDBA ZA POISKANJE VSEH PLAVALCEV, KI SO BILI DODELJENI
-- TEMU TERMINU V PREJŠNJEM MESECU (za pomoč pri obnovitvi):
-- ============================================================
SELECT DISTINCT
    s.id,
    s.first_name,
    s.last_name,
    s.email,
    s.phone
FROM swimmers s
WHERE 'tor-06:15-07:30' = ANY(s.terms)
  AND s.is_deleted = false
ORDER BY s.last_name, s.first_name;

-- ============================================================
-- GENERIRANJE TEMPLATE ZA OBNOVITEV (za vsak torek v prejšnjem mesecu):
-- ============================================================
-- Ta query generira template INSERT stavkov za vse torke v prejšnjem mesecu
-- 
WITH previous_month AS (
    SELECT 
        DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') AS start_date,
        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 day' AS end_date
),
all_dates_in_month AS (
    SELECT generate_series(
        pm.start_date::date,
        pm.end_date::date,
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
)
SELECT 
    'INSERT INTO attendance (date, term_id, swimmer_id, status) VALUES' AS template_start,
    FORMAT('(''%s'', ''tor-06:15-07:30'', ''%s'', ''present'');',
           t.tuesday_date,
           s.swimmer_id
    ) AS insert_statement
FROM tuesdays_in_month t
CROSS JOIN swimmers_with_term s
ORDER BY t.tuesday_date, s.swimmer_id;

