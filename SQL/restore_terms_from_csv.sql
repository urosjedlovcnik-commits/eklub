-- SQL skript za obnovitev terminov plavalcev iz CSV datoteke
-- Ta skripta predpostavlja, da imate CSV datoteko s plavalci in termini
-- Format CSV: first_name,last_name,email,phone,address,postal_code,terms

-- NAVODILA ZA UPORABO:
-- 1. Pripravi CSV datoteko v formatu:
--    first_name,last_name,email,phone,address,postal_code,terms
--    Janez,Novak,janez@example.com,040123456,Naslov 1,1000 Ljubljana,"pon-17:00-18:00,sre-18:00-19:00"
--
-- 2. Uporabi CSV uvoz v admin.js - sistem bo avtomatsko obnovil termine
--    ALI pa ročno z naslednjo SQL skripto (za napredne uporabnike)

-- PRIMER SQL za ročno obnovitev (prilagodi podatke):
-- Ta primer prikazuje, kako bi obnovil termine za posameznega plavalca

-- Metoda 1: Posodobi termine direktno (če imaš CSV podatke)
-- UPDATE swimmers 
-- SET terms = '["pon-17:00-18:00","sre-18:00-19:00"]'::jsonb
-- WHERE first_name = 'Janez' 
--   AND last_name = 'Novak'
--   AND is_deleted = false;

-- Metoda 2: Uporabi TEMP tabelo za hiter uvoz več plavalcev naenkrat
-- (To zahteva, da CSV vsebino ročno pretvoriš v SQL INSERT stavke)

-- KORAK 1: Preveri trenutno stanje plavalcev
SELECT 
    id,
    first_name,
    last_name,
    email,
    terms,
    CASE 
        WHEN terms IS NULL THEN 'BREZ TERMINOV'
        WHEN array_length(terms, 1) IS NULL THEN 'BREZ TERMINOV'
        WHEN array_length(terms, 1) = 0 THEN 'BREZ TERMINOV'
        ELSE 'IMA TERMINE: ' || array_length(terms, 1)::text
    END as status_terminov
FROM swimmers
WHERE is_deleted = false
ORDER BY last_name, first_name;

-- KORAK 2: Preveri, koliko plavalcev ima termine
SELECT 
    COUNT(*) as skupaj_plavalcev,
    COUNT(CASE 
        WHEN terms IS NOT NULL 
         AND array_length(terms, 1) IS NOT NULL
         AND array_length(terms, 1) > 0
        THEN 1 
    END) as plavalci_z_termini,
    COUNT(CASE 
        WHEN terms IS NULL 
         OR array_length(terms, 1) IS NULL
         OR array_length(terms, 1) = 0
        THEN 1 
    END) as plavalci_brez_terminov
FROM swimmers
WHERE is_deleted = false;

-- KORAK 3: NAVODILA ZA OBNOVITEV
-- Najlažje je, če uporabiš CSV uvoz v admin.js, ker sistem:
-- - Avtomatsko prepozna obstoječe plavalce
-- - Ohrani obstoječe termine, če CSV ne vsebuje terminov (po popravku)
-- - Doda nove termine, če so v CSV
--
-- Če CSV vsebuje termine, jih sistem prepiše.
-- Če CSV NE vsebuje terminov, sistem ohrani obstoječe (po popravku v admin.js)

SELECT 
    'UPORABI CSV UVOZ V ADMIN PANELU' as nasvet,
    'Sistem bo avtomatsko obnovil termine iz CSV datoteke' as navodilo;

