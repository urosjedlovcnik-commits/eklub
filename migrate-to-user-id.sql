-- Migracija za dodajanje user_id stolpca v tabelo trainers
-- Izvedite to skripto, če imate že obstoječe podatke

-- 1. Dodaj user_id stolpec (če ne obstaja)
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Posodobi obstoječe zapise z user_id (če je potrebno)
-- To je potrebno samo, če imate obstoječe trenerje brez user_id
-- Odkomentirajte in prilagodite spodnje vrstice:

/*
-- Poišči uporabnike v auth.users in poveži z trainers
UPDATE trainers 
SET user_id = auth.users.id 
FROM auth.users 
WHERE trainers.email = auth.users.email 
AND trainers.user_id IS NULL;
*/

-- 3. Dodaj indeks za user_id (če ne obstaja)
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);

-- 4. Posodobi RLS politike
-- Najprej izbriši obstoječe politike
DROP POLICY IF EXISTS "Trenerji lahko vidijo samo svoje podatke" ON trainers;
DROP POLICY IF EXISTS "Dovoli vstavljanje trenerjev" ON trainers;
DROP POLICY IF EXISTS "Trenerji lahko posodabljajo samo svoje podatke" ON trainers;
DROP POLICY IF EXISTS "Trenerji lahko vidijo svoje povezave s termini" ON trainer_terms;

-- Nato ustvari nove politike
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
