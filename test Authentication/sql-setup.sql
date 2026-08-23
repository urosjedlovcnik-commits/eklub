-- 🔐 SQL Setup za sistem vlog trenerjev

-- 1. DODAJ STOLPEC ZA VLOGE (če še ne obstaja)
ALTER TABLE trainers ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'trainer';

-- 2. NASTAVI MOŽNE VLOGE
-- trainer: osnovni trener - vidi samo svoje termine
-- trainer_admin: trener z admin pravicami - vidi vse termine
-- super_admin: popoln dostop (trenutni admin sistem)

-- 3. NASTAVI VLOGE OBSTOJEČIM TRENERJEM
-- Super admin (ohrani obstoječi admin sistem)
UPDATE trainers 
SET role = 'super_admin' 
WHERE email = 'uros.jedlovcnik@gmail.com';

-- Izberi enega trenerja kot trainer_admin (zamenjaj email)
UPDATE trainers 
SET role = 'trainer_admin' 
WHERE email = 'm4j0n3z4@gmail.com';  -- Spremeni na email trenerja, ki bo admin

-- Ostali so osnovni trenerji
UPDATE trainers 
SET role = 'trainer' 
WHERE role IS NULL OR role = '';

-- 4. PREVERI REZULTAT
SELECT email, first_name, last_name, role, user_id 
FROM trainers 
ORDER BY role DESC;

-- 5. RLS POLICIES za trainer sistem

-- Onemogoči obstoječe RLS če je problematičen
ALTER TABLE trainers DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_terms DISABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE substitute_trainers DISABLE ROW LEVEL SECURITY;

-- Kasneje lahko omogočimo z natančnejšimi policies:
/*
-- Omogoči RLS
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;

-- Policy za branje trenerjev
CREATE POLICY "trainers_read_policy" ON trainers
FOR SELECT TO authenticated USING (
  -- Super admin in trainer_admin vidijo vse
  EXISTS (
    SELECT 1 FROM trainers t 
    WHERE t.user_id = auth.uid() 
    AND t.role IN ('super_admin', 'trainer_admin')
  )
  OR 
  -- Osnovni trenerji vidijo samo sebe
  user_id = auth.uid()
);

-- Policy za pisanje (samo super_admin)
CREATE POLICY "trainers_write_policy" ON trainers
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM trainers t 
    WHERE t.user_id = auth.uid() 
    AND t.role = 'super_admin'
  )
);
*/

-- 6. USTVARI TESTNE UPORABNIKE (opcijsko)
-- To naredi v Supabase Dashboard -> Authentication -> Users

-- 7. INDEKSI ZA BOLJŠO PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_trainers_role ON trainers(role);
CREATE INDEX IF NOT EXISTS idx_trainers_user_id ON trainers(user_id);
CREATE INDEX IF NOT EXISTS idx_trainer_terms_trainer_id ON trainer_terms(trainer_id);

-- 8. VIEW ZA ENOSTAVNEJŠE POIZVEDBE
CREATE OR REPLACE VIEW trainer_permissions AS
SELECT 
  t.id,
  t.email,
  t.first_name,
  t.last_name,
  t.role,
  t.user_id,
  CASE 
    WHEN t.role = 'super_admin' THEN 'FULL_ACCESS'
    WHEN t.role = 'trainer_admin' THEN 'ALL_TRAININGS'
    WHEN t.role = 'trainer' THEN 'OWN_TRAININGS_ONLY'
    ELSE 'NO_ACCESS'
  END as permission_level
FROM trainers t
WHERE t.user_id IS NOT NULL;

-- 9. FUNKCIJA ZA PREVERJANJE DOVOLJENJ
CREATE OR REPLACE FUNCTION get_trainer_permission(trainer_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  trainer_role TEXT;
BEGIN
  SELECT role INTO trainer_role 
  FROM trainers 
  WHERE user_id = trainer_user_id;
  
  RETURN CASE 
    WHEN trainer_role = 'super_admin' THEN 'FULL_ACCESS'
    WHEN trainer_role = 'trainer_admin' THEN 'ALL_TRAININGS'
    WHEN trainer_role = 'trainer' THEN 'OWN_TRAININGS_ONLY'
    ELSE 'NO_ACCESS'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. TESTNE POIZVEDBE
-- Preveri vloge:
-- SELECT * FROM trainer_permissions;

-- Preveri dovoljenja:
-- SELECT get_trainer_permission('[user-id]');

-- 🔍 PREVERI STRUKTURO BAZE
-- Preveri, ali tabela trainer_attendance obstaja
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trainer_attendance'
) as table_exists;

-- Preveri, ali obstajajo podvojeni zapisi (če tabela obstaja)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trainer_attendance'
    ) THEN
        -- Preveri podvojene zapise
        IF EXISTS (
            SELECT trainer_id, date, COUNT(*)
            FROM trainer_attendance
            GROUP BY trainer_id, date
            HAVING COUNT(*) > 1
        ) THEN
            RAISE NOTICE 'NAJDENI PODVOJENI ZAPISI! Čistim...';
            
            -- Počisti podvojene zapise (obdrži najnovejši)
            DELETE FROM trainer_attendance 
            WHERE id NOT IN (
                SELECT DISTINCT ON (trainer_id, date) id
                FROM trainer_attendance
                ORDER BY trainer_id, date, created_at DESC NULLS LAST
            );
            
            RAISE NOTICE 'Podvojeni zapisi so bili počiščeni';
        ELSE
            RAISE NOTICE 'Ni podvojenih zapisov';
        END IF;
    END IF;
END $$;

-- Preveri strukturo tabele trainer_attendance (če obstaja)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trainer_attendance'
ORDER BY ordinal_position;

-- 🏊‍♂️ PREVERI IN POSODOBI TABELO TRENERJEVE PRISOTNOSTI
-- Najprej preveri, ali tabela obstaja in kakšna je njena struktura
DO $$
BEGIN
    -- Preveri, ali tabela obstaja
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'trainer_attendance') THEN
        RAISE NOTICE 'Tabela trainer_attendance že obstaja. Preverjam strukturo...';
        
        -- Preveri, ali stolpec is_present obstaja
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trainer_attendance' 
            AND column_name = 'is_present'
        ) THEN
            RAISE NOTICE 'Dodajam manjkajoči stolpec is_present...';
            ALTER TABLE trainer_attendance ADD COLUMN is_present BOOLEAN NOT NULL DEFAULT true;
        END IF;
        
        -- Preveri, ali stolpec notes obstaja
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trainer_attendance' 
            AND column_name = 'notes'
        ) THEN
            RAISE NOTICE 'Dodajam manjkajoči stolpec notes...';
            ALTER TABLE trainer_attendance ADD COLUMN notes TEXT;
        END IF;
        
        -- Preveri, ali stolpec created_at obstaja
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trainer_attendance' 
            AND column_name = 'created_at'
        ) THEN
            RAISE NOTICE 'Dodajam manjkajoči stolpec created_at...';
            ALTER TABLE trainer_attendance ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Preveri, ali stolpec updated_at obstaja
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trainer_attendance' 
            AND column_name = 'updated_at'
        ) THEN
            RAISE NOTICE 'Dodajam manjkajoči stolpec updated_at...';
            ALTER TABLE trainer_attendance ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Preveri, ali UNIQUE constraint obstaja
        IF NOT EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'trainer_attendance_trainer_id_date_key'
        ) THEN
            RAISE NOTICE 'Dodajam UNIQUE constraint...';
            
            -- Najprej počisti podvojene zapise
            RAISE NOTICE 'Čistim podvojene zapise...';
            DELETE FROM trainer_attendance 
            WHERE id NOT IN (
                SELECT DISTINCT ON (trainer_id, date) id
                FROM trainer_attendance
                ORDER BY trainer_id, date, created_at DESC
            );
            
            -- Sedaj dodaj UNIQUE constraint
            ALTER TABLE trainer_attendance ADD CONSTRAINT trainer_attendance_trainer_id_date_key UNIQUE(trainer_id, date);
            RAISE NOTICE 'UNIQUE constraint uspešno dodan';
        END IF;
        
    ELSE
        RAISE NOTICE 'Ustvarjam novo tabelo trainer_attendance...';
        CREATE TABLE trainer_attendance (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
            date DATE NOT NULL,
            is_present BOOLEAN NOT NULL DEFAULT true,
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Enoličnost: en trener lahko ima samo eno prisotnost na dan
            UNIQUE(trainer_id, date)
        );
    END IF;
END $$;

-- Dodaj indekse za hitrejše iskanje (če ne obstajajo)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_trainer_attendance_trainer_id') THEN
        CREATE INDEX idx_trainer_attendance_trainer_id ON trainer_attendance(trainer_id);
        RAISE NOTICE 'Indeks idx_trainer_attendance_trainer_id ustvarjen';
    ELSE
        RAISE NOTICE 'Indeks idx_trainer_attendance_trainer_id že obstaja';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_trainer_attendance_date') THEN
        CREATE INDEX idx_trainer_attendance_date ON trainer_attendance(date);
        RAISE NOTICE 'Indeks idx_trainer_attendance_date ustvarjen';
    ELSE
        RAISE NOTICE 'Indeks idx_trainer_attendance_date že obstaja';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_trainer_attendance_trainer_date') THEN
        CREATE INDEX idx_trainer_attendance_trainer_date ON trainer_attendance(trainer_id, date);
        RAISE NOTICE 'Indeks idx_trainer_attendance_trainer_date ustvarjen';
    ELSE
        RAISE NOTICE 'Indeks idx_trainer_attendance_trainer_date že obstaja';
    END IF;
END $$;

-- 🔐 RLS POLITIKE ZA TRENERJEVO PRISOTNOST
-- Omogoči RLS (če ni že omogočen)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'trainer_attendance' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE trainer_attendance ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS omogočen za tabelo trainer_attendance';
    ELSE
        RAISE NOTICE 'RLS je že omogočen za tabelo trainer_attendance';
    END IF;
END $$;

-- Politika: Trener lahko vidi samo svojo prisotnost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainer_attendance' 
        AND policyname = 'Trener lahko vidi svojo prisotnost'
    ) THEN
        CREATE POLICY "Trener lahko vidi svojo prisotnost" ON trainer_attendance
            FOR SELECT USING (
                auth.uid() IN (
                    SELECT user_id FROM trainers WHERE id = trainer_id
                )
            );
        RAISE NOTICE 'Politika "Trener lahko vidi svojo prisotnost" ustvarjena';
    ELSE
        RAISE NOTICE 'Politika "Trener lahko vidi svojo prisotnost" že obstaja';
    END IF;
END $$;

-- Politika: Trener lahko ustvari svojo prisotnost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainer_attendance' 
        AND policyname = 'Trener lahko ustvari svojo prisotnost'
    ) THEN
        CREATE POLICY "Trener lahko ustvari svojo prisotnost" ON trainer_attendance
            FOR INSERT WITH CHECK (
                auth.uid() IN (
                    SELECT user_id FROM trainers WHERE id = trainer_id
                )
            );
        RAISE NOTICE 'Politika "Trener lahko ustvari svojo prisotnost" ustvarjena';
    ELSE
        RAISE NOTICE 'Politika "Trener lahko ustvari svojo prisotnost" že obstaja';
    END IF;
END $$;

-- Politika: Trener lahko posodobi svojo prisotnost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainer_attendance' 
        AND policyname = 'Trener lahko posodobi svojo prisotnost'
    ) THEN
        CREATE POLICY "Trener lahko posodobi svojo prisotnost" ON trainer_attendance
            FOR UPDATE USING (
                auth.uid() IN (
                    SELECT user_id FROM trainers WHERE id = trainer_id
                )
            );
        RAISE NOTICE 'Politika "Trener lahko posodobi svojo prisotnost" ustvarjena';
    ELSE
        RAISE NOTICE 'Politika "Trener lahko posodobi svojo prisotnost" že obstaja';
    END IF;
END $$;

-- Politika: Admin lahko vidi vso prisotnost
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'trainer_attendance' 
        AND policyname = 'Admin lahko vidi vso prisotnost'
    ) THEN
        CREATE POLICY "Admin lahko vidi vso prisotnost" ON trainer_attendance
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM trainers 
                    WHERE user_id = auth.uid() 
                    AND role IN ('super_admin', 'trainer_admin')
                )
            );
        RAISE NOTICE 'Politika "Admin lahko vidi vso prisotnost" ustvarjena';
    ELSE
        RAISE NOTICE 'Politika "Admin lahko vidi vso prisotnost" že obstaja';
    END IF;
END $$;

-- 🔄 FUNKCIJA ZA AVTOMATSKO POSODABLJANJE updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Dodaj trigger za avtomatsko posodabljanje updated_at
DROP TRIGGER IF EXISTS update_trainer_attendance_updated_at ON trainer_attendance;
CREATE TRIGGER update_trainer_attendance_updated_at
    BEFORE UPDATE ON trainer_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 📊 PREVERI KONČNO STRUKTURO
-- Preveri, ali je tabela uspešno ustvarjena
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trainer_attendance'
ORDER BY ordinal_position;

-- Preveri RLS politike
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'trainer_attendance';

-- Preveri indekse
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'trainer_attendance';

-- 🧪 TESTIRAJ TABELO
-- Poskusi vstaviti test podatke (če obstajajo testni trenerji)
-- INSERT INTO trainer_attendance (trainer_id, date, is_present, notes)
-- SELECT 
--     t.id,
--     CURRENT_DATE,
--     true,
--     'Test prisotnost'
-- FROM trainers t
-- LIMIT 1;

-- Preveri testne podatke
-- SELECT * FROM trainer_attendance;

COMMIT;
