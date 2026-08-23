-- ===== PRISILNO POSODABLJANJE FUNKCIJ =====
-- Ta skript prisilno posodobi vse funkcije za kaskadno brisanje

-- 1. ODSTRANI OBSTOJEČE FUNKCIJE
DROP FUNCTION IF EXISTS delete_swimmer_cascade(UUID);
DROP FUNCTION IF EXISTS check_swimmer_connections(UUID);
DROP FUNCTION IF EXISTS restore_swimmer(UUID);

-- 2. USTVARI FUNKCIJO ZA KASKADNO BRISANJE PLAVALCA
CREATE OR REPLACE FUNCTION delete_swimmer_cascade(swimmer_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
    deleted_attendance INTEGER := 0;
    deleted_fees INTEGER := 0;
    deleted_swimmer INTEGER := 0;
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
        'deleted_swimmer', deleted_swimmer > 0
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
GRANT EXECUTE ON FUNCTION delete_swimmer_cascade(UUID) TO anon;
GRANT EXECUTE ON FUNCTION check_swimmer_connections(UUID) TO anon;
GRANT EXECUTE ON FUNCTION restore_swimmer(UUID) TO anon;

-- 6. PREVERI FUNKCIJE
SELECT 
    'Funkcije uspešno ustvarjene:' as info,
    routine_name as funkcija,
    routine_type as tip
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('delete_swimmer_cascade', 'check_swimmer_connections', 'restore_swimmer')
ORDER BY routine_name;

-- =====================================================
-- NAVODILA ZA UPORABO
-- =====================================================
-- 1. Zaženi to skripto v Supabase SQL editorju
-- 2. Preveri, da so se vse funkcije ustvarile
-- 3. Nato testiraj z test_cascade_delete.sql
