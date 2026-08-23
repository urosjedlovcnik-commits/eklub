-- Popravi dolžino postal_code stolpca
-- Postal code je bil definiran kot VARCHAR(10), vendar potrebujemo več prostora za vrednosti kot "1000 Ljubljana"

DO $$
BEGIN
    -- Preveri, ali postal_code obstaja in ali je VARCHAR(10)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'postal_code'
        AND character_maximum_length = 10
    ) THEN
        -- Spremeni tip stolpca iz VARCHAR(10) v TEXT
        ALTER TABLE swimmers ALTER COLUMN postal_code TYPE TEXT;
        RAISE NOTICE 'Stolpec postal_code je bil spremenjen iz VARCHAR(10) v TEXT';
    ELSE
        RAISE NOTICE 'Stolpec postal_code ne obstaja ali ni VARCHAR(10)';
    END IF;
END $$;

-- Preveri trenutno strukturo
SELECT 
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'swimmers' 
AND column_name = 'postal_code';

