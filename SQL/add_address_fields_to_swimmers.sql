-- SQL skript za dodajanje polj za naslov in pošto v tabelo swimmers
-- Datum: $(date)
-- Opis: Doda stolpca 'address' in 'postal_code' v tabelo swimmers

-- Preveri, ali stolpca že obstajata
DO $$
BEGIN
    -- Dodaj stolpec 'address', če ne obstaja
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'address'
    ) THEN
        ALTER TABLE swimmers ADD COLUMN address TEXT;
        RAISE NOTICE 'Dodan stolpec address v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec address že obstaja v tabeli swimmers';
    END IF;

    -- Dodaj stolpec 'postal_code', če ne obstaja
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE swimmers ADD COLUMN postal_code TEXT;
        RAISE NOTICE 'Dodan stolpec postal_code v tabelo swimmers';
    ELSE
        RAISE NOTICE 'Stolpec postal_code že obstaja v tabeli swimmers';
    END IF;
END $$;

-- Preveri strukturo tabele
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'swimmers' 
ORDER BY ordinal_position;
