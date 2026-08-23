-- Faza 1: Avtentikacija trenerjev (vloge + povezava z Supabase Auth)
-- Poženite v Supabase SQL Editor.

-- 1. Stolpec vloge
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'trainer';

-- 2. Super admin (Uroš) — prilagodite email, če je drugačen
UPDATE trainers
SET role = 'super_admin'
WHERE email = 'uros.jedlovcnik@gmail.com';

-- 3. Poveži user_id, ko ustvarite uporabnika v Supabase Auth
-- (Dashboard → Authentication → Users → Add user)
-- UUID kopirajte iz auth.users in prilepite spodaj:
--
-- UPDATE trainers
-- SET user_id = '8615f0eb-e1e9-4ce8-8d16-a7e677207da2'::uuid,
--     role = 'super_admin'
-- WHERE email = 'uros.jedlovcnik@gmail.com';

-- 4. Indeksi
CREATE INDEX IF NOT EXISTS idx_trainers_role ON trainers(role);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);

-- 5. Preverite
SELECT id, email, first_name, last_name, role, user_id
FROM trainers
ORDER BY role DESC, last_name;
