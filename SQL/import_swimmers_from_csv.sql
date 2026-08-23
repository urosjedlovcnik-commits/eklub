-- SQL skript za pomoč pri uvozu plavalcev iz CSV
-- To je helper skripta za pregled podatkov

-- PRED UVOZOM: Preveri, katere plavalce boš uvozil
-- (Primer - prilagodi glede na tvoj CSV)

-- Primer: Preveri, ali plavalec že obstaja
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    terms,
    is_deleted
FROM swimmers
WHERE first_name = 'Janez'  -- Zamenjaj s podatki iz CSV
  AND last_name = 'Novak'   -- Zamenjaj s podatki iz CSV
  AND is_deleted = false;

-- Če želiš, lahko tudi direktno v SQL uvoziš podatke
-- (Vendar je lažje uporabiti admin panel CSV uvoz)

-- PRIMER: Ročna posodobitev terminov iz CSV podatkov
-- (Uporabi to LE, če poznaš SQL in veš, kaj delaš)
/*
UPDATE swimmers
SET 
    terms = '["pon-17:00-18:00","sre-18:00-19:00"]'::jsonb,
    email = COALESCE(email, 'nov-email@example.com'),
    phone = COALESCE(phone, '+386 40 123 456')
WHERE first_name = 'Janez'
  AND last_name = 'Novak'
  AND is_deleted = false;
*/

-- PREPORAČAMO: Uporabi admin panel CSV uvoz
-- 1. Odpri admin.html
-- 2. Pojdi v sekcijo "CSV uvoz/izvoz"
-- 3. Izberi CSV datoteko s plavalci
-- 4. Sistem bo avtomatsko:
--    - Prepoznal obstoječe plavalce
--    - Obnovil termine iz CSV
--    - Ohranil obstoječe termine, če CSV ne vsebuje terminov (po popravku)

SELECT 
    'NAJLAŽJE: Uporabi CSV uvoz v admin panelu' as priporocilo,
    'admin.html > CSV uvoz/izvoz > Uvozi plavalce' as navodilo;

