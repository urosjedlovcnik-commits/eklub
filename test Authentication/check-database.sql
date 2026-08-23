-- 🔍 Preveri strukturo baze in popravi probleme

-- 1. PREVERI STRUKTURO TRENERS TABELE
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'trainers' 
ORDER BY ordinal_position;

-- 2. PREVERI OBSTOJEČE TRENERJE
SELECT id, email, first_name, last_name, role, user_id
FROM trainers 
ORDER BY role DESC;

-- 3. PREVERI AUTH USERS
SELECT id, email, created_at
FROM auth.users 
WHERE email IN (
    'uros.jedlovcnik@gmail.com',
    'm4j0n3z4@gmail.com',
    'uros@playworldgame.ocm'
);

-- 4. DODAJ MANJKAJOČE STOLPCE (če ne obstajajo)
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'trainer';

-- 5. POSODOBI user_id STOLPCE Z AUTH USERS
UPDATE trainers 
SET user_id = auth.users.id
FROM auth.users 
WHERE trainers.email = auth.users.email;

-- 6. PREVERI REZULTAT
SELECT 
    t.id,
    t.email,
    t.first_name,
    t.last_name,
    t.role,
    t.user_id,
    au.id as auth_user_id,
    au.email as auth_email
FROM trainers t
LEFT JOIN auth.users au ON t.user_id = au.id
ORDER BY t.role DESC;

-- 7. ČE JE user_id NULL, poskusi povezati po emailu
UPDATE trainers 
SET user_id = (
    SELECT id FROM auth.users 
    WHERE email = trainers.email
)
WHERE user_id IS NULL;

-- 8. PREVERI FINALNO STANJE
SELECT 
    t.id,
    t.email,
    t.first_name,
    t.last_name,
    t.role,
    t.user_id,
    CASE 
        WHEN t.user_id IS NOT NULL THEN 'POVEZAN'
        ELSE 'NI POVEZAN'
    END as status
FROM trainers t
ORDER BY t.role DESC;
