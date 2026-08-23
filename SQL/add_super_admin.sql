-- Dodajanje super admina (npr. vodja kluba) — brez dodeljenih terminov
-- Ni trener na vadbi; ima dostop do koledarja (vsi termini) + admin panela.
-- Lahko imate več super_admin računov hkrati.

-- ===== KORAK 1: Supabase Dashboard =====
-- Authentication → Users → Add user
--   Email: vodja@example.si
--   Password: (nastavite geslo)
--   Auto Confirm User: ON
-- Kopirajte UUID novega uporabnika (User UID).

-- ===== KORAK 2: Vrstica v trainers =====
-- Če email še ni v tabeli — INSERT. Če je (npr. bil trener) — UPDATE spodaj.

-- INSERT (nov uporabnik):
INSERT INTO trainers (id, email, first_name, last_name, role, user_id)
VALUES (
  gen_random_uuid(),
  'vodja@example.si',
  'Ime',
  'Priimek',
  'super_admin',
  'PASTE-AUTH-USER-UUID-HERE'::uuid
);

-- ALI UPDATE (že obstaja vrstica s tem emailom):
-- UPDATE trainers
-- SET role = 'super_admin',
--     user_id = 'PASTE-AUTH-USER-UUID-HERE'::uuid,
--     first_name = 'Ime',
--     last_name = 'Priimek'
-- WHERE email = 'vodja@example.si';

-- NE dodajajte vrstic v trainer_terms — ni trener na terminih.

-- ===== KORAK 3: Preverite =====
SELECT email, first_name, last_name, role, user_id
FROM trainers
WHERE role = 'super_admin'
ORDER BY email;

-- Prijava: https://eklub.vercel.app/login.html
-- Vidi: vse termine, admin panel, finance. Ne vodi vadbe (ni v trainer_terms).
