-- SQL skript za obnovitev podatkov plavalcev iz backupa
-- POZOR: Ta skripta zahteva, da imate backup podatkov!

-- PRED IZVEDBO:
-- 1. Preverite, ali imate backup podatkov v Supabase Point-in-Time Recovery
-- 2. Ali pa imate eksport podatkov pred uvozom
-- 3. Prilagodite UPDATE stavke z vašimi podatki

-- Primer: Obnovitev terminov za plavalce (če imate backup)
-- Zamenjajte 'OLD_TERMS' z dejanskimi podatki iz vašega backupa

-- OPCIJA 1: Obnovi termine za posameznega plavalca
-- UPDATE swimmers 
-- SET terms = '["pon-17:00-18:00","sre-18:00-19:00"]'::jsonb
-- WHERE id = 'UUID_PLAVALCA'
-- AND (terms IS NULL OR terms = '[]'::jsonb);

-- OPCIJA 2: Obnovi več plavalcev naenkrat (primerjaj po imenu)
-- UPDATE swimmers
-- SET terms = backup_data.terms
-- FROM (
--     VALUES 
--         ('Janez', 'Novak', '["pon-17:00-18:00"]'::jsonb),
--         ('Maja', 'Kovač', '["sre-18:00-19:00"]'::jsonb)
--     AS backup_data(first_name, last_name, terms)
-- ) AS backup_data
-- WHERE swimmers.first_name = backup_data.first_name
--   AND swimmers.last_name = backup_data.last_name
--   AND (swimmers.terms IS NULL OR swimmers.terms = '[]'::jsonb);

-- OPCIJA 3: Preveri, ali Supabase podpira Point-in-Time Recovery
-- 1. Odprite Supabase Dashboard
-- 2. Pojdite v Database > Backups
-- 3. Preverite, ali je na voljo Point-in-Time Recovery
-- 4. Če je, lahko obnovite stanje pred uvozom

-- POZOR: Preverite, da podatki obstajajo, preden jih obnavljate!
-- Najprej poženite check_swimmers_data_loss.sql, da vidite, katere podatke morate obnoviti

SELECT 
    'POMEMBNO: Pred izvedbo UPDATE stavk preverite backup podatke!' as opozorilo,
    'Za obnovitev kontaktirajte Supabase podporo ali uporabite Point-in-Time Recovery' as nasvet;

