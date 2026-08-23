-- Popravek UNIQUE constraint za trainer_attendance tabelo
-- Problem: UNIQUE constraint je definiran samo na (trainer_id, date), 
-- kar ne dovoljuje, da trener ima več terminov na dan
-- Rešitev: Spremeniti constraint na (trainer_id, date, term_id)

DO $$
BEGIN
    -- Preveri, ali tabela trainer_attendance obstaja
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trainer_attendance'
    ) THEN
        RAISE NOTICE 'Tabela trainer_attendance obstaja. Preverjam constraint...';
        
        -- Preveri, ali stari constraint obstaja
        IF EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'trainer_attendance_trainer_id_date_key'
        ) THEN
            RAISE NOTICE 'Odstranjujem stari UNIQUE constraint (trainer_id, date)...';
            
            -- Odstrani stari constraint
            ALTER TABLE trainer_attendance 
            DROP CONSTRAINT IF EXISTS trainer_attendance_trainer_id_date_key;
            
            RAISE NOTICE 'Stari constraint uspešno odstranjen';
        ELSE
            RAISE NOTICE 'Stari constraint ne obstaja';
        END IF;
        
        -- Preveri, ali stolpec term_id obstaja
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trainer_attendance' 
            AND column_name = 'term_id'
        ) THEN
            RAISE NOTICE 'Dodajam manjkajoči stolpec term_id...';
            ALTER TABLE trainer_attendance 
            ADD COLUMN term_id TEXT;
            RAISE NOTICE 'Stolpec term_id uspešno dodan';
        ELSE
            RAISE NOTICE 'Stolpec term_id že obstaja';
        END IF;
        
        -- Preveri, ali nov constraint že obstaja
        IF NOT EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'trainer_attendance_trainer_id_date_term_id_key'
        ) THEN
            RAISE NOTICE 'Dodajam nov UNIQUE constraint (trainer_id, date, term_id)...';
            
            -- Najprej počisti morebitne podvojene zapise (obdrži najnovejši)
            RAISE NOTICE 'Čistim podvojene zapise...';
            DELETE FROM trainer_attendance 
            WHERE id NOT IN (
                SELECT DISTINCT ON (trainer_id, date, term_id) id
                FROM trainer_attendance
                WHERE term_id IS NOT NULL
                ORDER BY trainer_id, date, term_id, created_at DESC
            );
            
            -- Dodaj nov UNIQUE constraint
            -- Vrstni red: trainer_id, date, term_id (mora biti enak kot v onConflict v kodi)
            ALTER TABLE trainer_attendance 
            ADD CONSTRAINT trainer_attendance_trainer_id_date_term_id_key 
            UNIQUE(trainer_id, date, term_id);
            
            RAISE NOTICE 'Nov UNIQUE constraint uspešno dodan';
        ELSE
            RAISE NOTICE 'Nov constraint že obstaja';
        END IF;
        
        RAISE NOTICE 'Popravek UNIQUE constrainta končan';
    ELSE
        RAISE NOTICE 'Tabela trainer_attendance ne obstaja - ni potrebno popraviti';
    END IF;
END $$;

-- Preveri rezultat
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'trainer_attendance'::regclass
AND contype = 'u'
ORDER BY conname;

