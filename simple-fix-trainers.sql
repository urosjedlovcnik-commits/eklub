-- Enostaven popravek za tabelo trainers
-- Izvedite to skripto, če imate napako "Could not find the 'user_id' column"

-- 1. Dodaj user_id stolpec (če ne obstaja)
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Posodobi obstoječe zapise z user_id
UPDATE trainers 
SET user_id = auth.users.id 
FROM auth.users 
WHERE trainers.email = auth.users.email 
AND trainers.user_id IS NULL;

-- 3. Dodaj indeks za user_id (če ne obstaja)
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);

-- 4. Preveri rezultat
SELECT 
    t.id,
    t.user_id,
    t.email,
    t.first_name,
    t.last_name,
    CASE 
        WHEN t.user_id IS NOT NULL THEN 'OK - povezan z auth.users'
        ELSE 'NAPAKA - ni povezan z auth.users'
    END as status
FROM trainers t
ORDER BY t.created_at DESC;
