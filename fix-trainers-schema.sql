-- Popravek sheme za tabelo trainers - rešitev napake "Could not find the 'user_id' column"
-- Izvedite to skripto v Supabase SQL Editor

-- 1. Dodaj user_id stolpec v tabelo trainers
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Posodobi obstoječe zapise (če obstajajo)
-- Poveži obstoječe trenerje z auth.users na podlagi email naslova
UPDATE trainers 
SET user_id = auth.users.id 
FROM auth.users 
WHERE trainers.email = auth.users.email 
AND trainers.user_id IS NULL;

-- 3. Dodaj indeks za user_id
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);

-- 4. Posodobi RLS politike - varno odstrani in ponovno ustvari
-- Najprej izbriši obstoječe politike (če obstajajo)
DROP POLICY IF EXISTS "Trenerji lahko vidijo samo svoje podatke" ON trainers;
DROP POLICY IF EXISTS "Dovoli vstavljanje trenerjev" ON trainers;
DROP POLICY IF EXISTS "Trenerji lahko posodabljajo samo svoje podatke" ON trainers;
DROP POLICY IF EXISTS "Trenerji lahko vidijo svoje povezave s termini" ON trainer_terms;

-- Nato ustvari nove politike z user_id
CREATE POLICY "Trenerji lahko vidijo samo svoje podatke" ON trainers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Dovoli vstavljanje trenerjev" ON trainers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Trenerji lahko posodabljajo samo svoje podatke" ON trainers
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Trenerji lahko vidijo svoje povezave s termini" ON trainer_terms
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
    );

-- 5. Preveri rezultat
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
