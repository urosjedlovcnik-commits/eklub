-- Nastavitev tabel za autentikacijo trenerjev

-- 1. Tabela za trenerje
CREATE TABLE IF NOT EXISTS trainers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela za povezavo trenerjev s termini
CREATE TABLE IF NOT EXISTS trainer_terms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trainer_id UUID REFERENCES trainers(id) ON DELETE CASCADE,
    term_id TEXT REFERENCES terms(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(trainer_id, term_id)
);

-- 3. Omogoči RLS (Row Level Security) za tabelo trainers
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- 4. Omogoči RLS za tabelo trainer_terms
ALTER TABLE trainer_terms ENABLE ROW LEVEL SECURITY;

-- 5. Nastavi politike za tabelo trainers
-- Dovoli branje samo trenerjem, ki so prijavljeni
CREATE POLICY "Trenerji lahko vidijo samo svoje podatke" ON trainers
    FOR SELECT USING (auth.uid() = user_id);

-- Dovoli vstavljanje novih trenerjev (za registracijo)
CREATE POLICY "Dovoli vstavljanje trenerjev" ON trainers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Dovoli posodabljanje samo svojih podatkov
CREATE POLICY "Trenerji lahko posodabljajo samo svoje podatke" ON trainers
    FOR UPDATE USING (auth.uid() = user_id);

-- 6. Nastavi politike za tabelo trainer_terms
-- Dovoli branje samo trenerjem, ki so povezani s termini
CREATE POLICY "Trenerji lahko vidijo svoje povezave s termini" ON trainer_terms
    FOR SELECT USING (
        trainer_id IN (
            SELECT id FROM trainers WHERE user_id = auth.uid()
        )
    );

-- Dovoli vstavljanje povezav (samo admin)
CREATE POLICY "Dovoli vstavljanje povezav trener-termin" ON trainer_terms
    FOR INSERT WITH CHECK (true);

-- Dovoli brisanje povezav (samo admin)
CREATE POLICY "Dovoli brisanje povezav trener-termin" ON trainer_terms
    FOR DELETE USING (true);

-- 7. Funkcija za avtomatsko posodabljanje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Trigger za avtomatsko posodabljanje updated_at
CREATE TRIGGER update_trainers_updated_at 
    BEFORE UPDATE ON trainers 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Vstavitev testnih podatkov (opcijsko)
-- Odkomentirajte spodnje vrstice, če želite dodati testne trenerje

/*
INSERT INTO trainers (user_id, email, first_name, last_name) VALUES
('user-uuid-1', 'trener1@example.com', 'Janez', 'Novak'),
('user-uuid-2', 'trener2@example.com', 'Maja', 'Kovač'),
('user-uuid-3', 'trener3@example.com', 'Peter', 'Horvat');

-- Poveži trenerje z obstoječimi termini (prilagodite ID-je terminov)
INSERT INTO trainer_terms (trainer_id, term_id) 
SELECT t.id, 'pon-17:00-18:00' 
FROM trainers t 
WHERE t.email = 'trener1@example.com';

INSERT INTO trainer_terms (trainer_id, term_id) 
SELECT t.id, 'sre-18:00-19:00' 
FROM trainers t 
WHERE t.email = 'trener2@example.com';
*/

-- 10. Funkcija za pridobivanje terminov trenerja
CREATE OR REPLACE FUNCTION get_trainer_terms(trainer_email TEXT)
RETURNS TABLE(term_id TEXT) AS $$
BEGIN
    RETURN QUERY
    SELECT tt.term_id
    FROM trainer_terms tt
    JOIN trainers t ON tt.trainer_id = t.id
    WHERE t.email = trainer_email;
END;
$$ LANGUAGE plpgsql;

-- 11. Funkcija za pridobivanje plavalcev trenerja
CREATE OR REPLACE FUNCTION get_trainer_swimmers(trainer_email TEXT)
RETURNS TABLE(
    id UUID,
    first_name TEXT,
    last_name TEXT,
    terms TEXT[],
    is_deleted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT s.id, s.first_name, s.last_name, s.terms, s.is_deleted
    FROM swimmers s
    JOIN trainer_terms tt ON tt.term_id = ANY(s.terms)
    JOIN trainers t ON tt.trainer_id = t.id
    WHERE t.email = trainer_email AND s.is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- 12. Indeksi za boljšo zmogljivost
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_terms_trainer_id ON trainer_terms(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_terms_term_id ON trainer_terms(term_id);
CREATE INDEX IF NOT EXISTS idx_trainer_terms_composite ON trainer_terms(trainer_id, term_id);
