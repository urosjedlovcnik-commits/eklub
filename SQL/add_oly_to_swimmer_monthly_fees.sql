-- ===== DODAJANJE OLY POLJA V TABELO SWIMMER_MONTHLY_FEES =====
-- Ta skript doda polje is_oly za OLY opcijo pri vadninah

-- 1. DODAJ POLJE is_oly (če ne obstaja)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'swimmer_monthly_fees'
        AND column_name = 'is_oly'
    ) THEN
        ALTER TABLE swimmer_monthly_fees ADD COLUMN is_oly BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Dodan stolpec is_oly v tabelo swimmer_monthly_fees';
    ELSE
        RAISE NOTICE 'Stolpec is_oly že obstaja v tabeli swimmer_monthly_fees';
    END IF;
END $$;

-- 2. PREVERI STRUKTURO TABELE
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'swimmer_monthly_fees'
ORDER BY ordinal_position;

-- 3. PREVERI OBSTOJEČE VADNINE Z OLY STATUSOM
SELECT 
    COUNT(*) as skupaj_vadnin,
    COUNT(CASE WHEN is_oly = true THEN 1 END) as oly_vadnin,
    COUNT(CASE WHEN is_oly = true OR is_oly IS NULL THEN 1 END) as ne_oly_vadnin
FROM swimmer_monthly_fees;

