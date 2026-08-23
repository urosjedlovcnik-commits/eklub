-- SQL skript za obnovitev terminov plavalcev iz zapisov prisotnosti
-- Ta skripta uporablja podatke iz tabele attendance za oktober 2024
-- da obnovi termine, ki so bili izbrisani

-- KORAK 1: Preveri, katere termine lahko obnovimo iz prisotnosti
-- (Poišče vse termine, pri katerih so bili plavalci prisotni v oktobru)
WITH october_attendance AS (
    SELECT DISTINCT
        a.swimmer_id,
        a.term_id
    FROM attendance a
    WHERE a.date >= '2024-10-01' 
      AND a.date < '2024-11-01'
),
swimmer_terms_to_restore AS (
    SELECT 
        sa.swimmer_id,
        ARRAY_AGG(DISTINCT sa.term_id ORDER BY sa.term_id) as restored_terms
    FROM october_attendance sa
    GROUP BY sa.swimmer_id
)
SELECT 
    s.id as swimmer_id,
    s.first_name,
    s.last_name,
    s.terms as current_terms,
    st.restored_terms as terms_from_attendance,
    CASE 
        WHEN s.terms IS NULL 
             OR array_length(s.terms, 1) IS NULL
             OR array_length(s.terms, 1) = 0
        THEN 'MORA OBNOVITI'
        WHEN (SELECT COUNT(*) FROM unnest(s.terms) 
              WHERE unnest::text NOT IN (SELECT unnest::text FROM unnest(st.restored_terms))) > 0 
        THEN 'DELNO - IMAMO NOVE TERMINE'
        ELSE 'IMAMO VSE'
    END as status
FROM swimmers s
INNER JOIN swimmer_terms_to_restore st ON s.id = st.swimmer_id
WHERE s.is_deleted = false
ORDER BY s.last_name, s.first_name;

-- KORAK 2: Predhodni pregled - koliko plavalcev lahko obnovimo
SELECT 
    COUNT(DISTINCT a.swimmer_id) as plavalci_z_zapisi_prisotnosti,
    COUNT(DISTINCT a.term_id) as razlicni_termini,
    COUNT(*) as skupno_zapisov_prisotnosti
FROM attendance a
WHERE a.date >= '2024-10-01' 
  AND a.date < '2024-11-01';

-- KORAK 3: OBNOVI TERMINE (POŽENI LE, ČE SI PREPRIČAN!)
-- Ta UPDATE bo za vsakega plavalca, ki ima zapise prisotnosti v oktobru,
-- obnovil termine na podlagi terminov, pri katerih so bili prisotni
WITH october_attendance AS (
    SELECT DISTINCT
        a.swimmer_id,
        a.term_id
    FROM attendance a
    WHERE a.date >= '2024-10-01' 
      AND a.date < '2024-11-01'
),
swimmer_terms_to_restore AS (
    SELECT 
        sa.swimmer_id,
        ARRAY_AGG(DISTINCT sa.term_id ORDER BY sa.term_id) as restored_terms
    FROM october_attendance sa
    GROUP BY sa.swimmer_id
),
merged_terms AS (
    SELECT 
        s.id as swimmer_id,
        COALESCE(
            -- Če ima plavalec že termine, jih združi z novimi
            CASE 
                WHEN s.terms IS NOT NULL 
                     AND array_length(s.terms, 1) IS NOT NULL
                     AND array_length(s.terms, 1) > 0
                THEN
                    (
                        SELECT ARRAY_AGG(DISTINCT term ORDER BY term)
                        FROM (
                            SELECT unnest::text as term 
                            FROM unnest(s.terms)
                            UNION
                            SELECT unnest::text as term
                            FROM unnest(st.restored_terms)
                        ) combined
                    )
                ELSE st.restored_terms::text[]
            END,
            st.restored_terms::text[]
        ) as final_terms
    FROM swimmers s
    INNER JOIN swimmer_terms_to_restore st ON s.id = st.swimmer_id
    WHERE s.is_deleted = false
)
-- ODKOMENTIRAJ NASLEDNJO VRSTICO ZA IZVEDBO UPDATE:
-- UPDATE swimmers s
-- SET terms = (
--     SELECT final_terms::jsonb 
--     FROM merged_terms mt 
--     WHERE mt.swimmer_id = s.id
-- )
-- WHERE s.id IN (SELECT swimmer_id FROM merged_terms)
--   AND s.is_deleted = false;

SELECT 
    'ODKOMENTIRAJ UPDATE STAVEK ZGORAJ ZA IZVEDBO OBNOVITVE!' as opozorilo,
    'Najprej preveri rezultate KORAKA 1 in 2' as nasvet;

