-- ===== KASKADNO BRISANJE PLAVALCA =====
-- Ta skript implementira kaskadno brisanje plavalca iz vseh povezanih tabel
-- Plavalec se izbriše iz: attendance, swimmer_monthly_fees in swimmers tabel

-- 1. PREVERI IN DODAJ POTREBNE STOLPCE
-- Preveri, če stolpec is_deleted obstaja v tabeli swimmers
DO $$ 
BEGIN
    -- Dodaj stolpec is_deleted, če ne obstaja
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'swimmers' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE "public"."swimmers" ADD COLUMN "is_deleted" BOOLEAN DEFAULT false;
        RAISE NOTICE 'Stolpec is_deleted je bil dodan v tabelo swimmers';
    END IF;
END $$;

-- 2. USTVARI FUNKCIJO ZA KASKADNO BRISANJE PLAVALCA
CREATE OR REPLACE FUNCTION delete_swimmer_cascade(swimmer_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    deleted_attendance INTEGER := 0;
    deleted_fees INTEGER := 0;
    deleted_swimmer BOOLEAN := false;
    swimmer_name TEXT;
BEGIN
    -- Preveri, če plavalec obstaja
    SELECT first_name || ' ' || last_name INTO swimmer_name
    FROM swimmers 
    WHERE id = swimmer_uuid AND is_deleted = false;
    
    IF swimmer_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Plavalec ne obstaja ali je že izbrisan',
            'deleted_attendance', 0,
            'deleted_fees', 0,
            'deleted_swimmer', false
        );
    END IF;
    
    -- Izbriši evidenc prisotnosti
    DELETE FROM attendance WHERE swimmer_id = swimmer_uuid;
    GET DIAGNOSTICS deleted_attendance = ROW_COUNT;
    
    -- Izbriši mesečne pristojbine
    DELETE FROM swimmer_monthly_fees WHERE swimmer_id = swimmer_uuid;
    GET DIAGNOSTICS deleted_fees = ROW_COUNT;
    
    -- Označi plavalca kot izbrisanega (soft delete)
    UPDATE swimmers 
    SET is_deleted = true
    WHERE id = swimmer_uuid;
    
    GET DIAGNOSTICS deleted_swimmer = ROW_COUNT;
    
    -- Vrni rezultat
    result := json_build_object(
        'success', true,
        'message', 'Plavalec ' || swimmer_name || ' uspešno izbrisan',
        'swimmer_name', swimmer_name,
        'deleted_attendance', deleted_attendance,
        'deleted_fees', deleted_fees,
        'deleted_swimmer', deleted_swimmer
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Napaka pri brisanju plavalca: ' || SQLERRM,
            'deleted_attendance', 0,
            'deleted_fees', 0,
            'deleted_swimmer', false
        );
END;
$$ LANGUAGE plpgsql;

-- 3. USTVARI FUNKCIJO ZA PREVERJANJE POVEZAV PLAVALCA
CREATE OR REPLACE FUNCTION check_swimmer_connections(swimmer_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    attendance_count INTEGER := 0;
    fees_count INTEGER := 0;
    swimmer_name TEXT;
BEGIN
    -- Preveri, če plavalec obstaja
    SELECT first_name || ' ' || last_name INTO swimmer_name
    FROM swimmers 
    WHERE id = swimmer_uuid AND is_deleted = false;
    
    IF swimmer_name IS NULL THEN
        RETURN json_build_object(
            'exists', false,
            'message', 'Plavalec ne obstaja ali je že izbrisan'
        );
    END IF;
    
    -- Preštej povezave
    SELECT COUNT(*) INTO attendance_count FROM attendance WHERE swimmer_id = swimmer_uuid;
    SELECT COUNT(*) INTO fees_count FROM swimmer_monthly_fees WHERE swimmer_id = swimmer_uuid;
    
    result := json_build_object(
        'exists', true,
        'swimmer_name', swimmer_name,
        'attendance_records', attendance_count,
        'fees_records', fees_count,
        'total_connections', attendance_count + fees_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. USTVARI FUNKCIJO ZA OBRATNO BRISANJE (RESTORE)
CREATE OR REPLACE FUNCTION restore_swimmer(swimmer_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    swimmer_name TEXT;
    restored INTEGER := 0;
BEGIN
    -- Preveri, če plavalec obstaja in je označen kot izbrisan
    SELECT first_name || ' ' || last_name INTO swimmer_name
    FROM swimmers 
    WHERE id = swimmer_uuid AND is_deleted = true;
    
    IF swimmer_name IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Plavalec ne obstaja ali ni označen kot izbrisan'
        );
    END IF;
    
    -- Obnovi plavalca
    UPDATE swimmers 
    SET is_deleted = false
    WHERE id = swimmer_uuid;
    
    GET DIAGNOSTICS restored = ROW_COUNT;
    
    result := json_build_object(
        'success', restored > 0,
        'message', CASE 
            WHEN restored > 0 THEN 'Plavalec ' || swimmer_name || ' uspešno obnovljen'
            ELSE 'Napaka pri obnavljanju plavalca'
        END,
        'swimmer_name', swimmer_name
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. DODAJ RLS POLICY ZA FUNKCIJE
-- Omogoči javni dostop do funkcij
GRANT EXECUTE ON FUNCTION delete_swimmer_cascade(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_swimmer_connections(UUID) TO anon;
GRANT EXECUTE ON FUNCTION restore_swimmer(UUID) TO anon;

-- 6. PRIMER UPORABE FUNKCIJ
-- Preveri povezave plavalca
-- SELECT check_swimmer_connections('swimmer-uuid-here');

-- Izbriši plavalca s kaskadnim brisanjem
-- SELECT delete_swimmer_cascade('swimmer-uuid-here');

-- Obnovi plavalca
-- SELECT restore_swimmer('swimmer-uuid-here');

-- 7. PREVERI OBSTOJEČE POVEZAVE
SELECT 
    'Preverjanje obstoječih povezav' as info,
    COUNT(DISTINCT a.swimmer_id) as plavalci_z_prisotnostjo,
    COUNT(a.*) as skupno_prisotnost,
    COUNT(DISTINCT smf.swimmer_id) as plavalci_z_vadninami,
    COUNT(smf.*) as skupno_vadnin
FROM swimmers s
LEFT JOIN attendance a ON s.id = a.swimmer_id
LEFT JOIN swimmer_monthly_fees smf ON s.id = smf.swimmer_id
WHERE s.is_deleted = false;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Funkcije so na voljo za uporabo v admin aplikaciji
-- 3. delete_swimmer_cascade() - izbriše plavalca iz vseh tabel
-- 4. check_swimmer_connections() - preveri povezave pred brisanjem
-- 5. restore_swimmer() - obnovi plavalca (če je bil označen kot izbrisan)
-- 6. Vse funkcije vračajo JSON z rezultati operacije
