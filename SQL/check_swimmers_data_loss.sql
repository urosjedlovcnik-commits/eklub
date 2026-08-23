-- SQL skript za preverjanje izgubljenih podatkov plavalcev
-- Ta skripta preverja, ali imajo plavalci izbrisane termine

-- Preveri plavalce brez terminov
SELECT 
    id,
    first_name,
    last_name,
    email,
    phone,
    terms,
    is_deleted
FROM swimmers
WHERE 
    (
        terms IS NULL 
        OR array_length(terms, 1) IS NULL
        OR array_length(terms, 1) = 0
    )
    AND is_deleted = false
ORDER BY last_name, first_name;

-- Preveri število plavalcev brez terminov
SELECT 
    COUNT(*) as plavalci_brez_terminov,
    COUNT(CASE WHEN terms IS NULL THEN 1 END) as null_terms,
    COUNT(CASE 
        WHEN array_length(terms, 1) IS NULL
         OR array_length(terms, 1) = 0
        THEN 1 
    END) as empty_array_terms
FROM swimmers
WHERE is_deleted = false;

-- Preveri prisotnost za plavalce brez terminov
SELECT 
    s.id,
    s.first_name,
    s.last_name,
    COUNT(a.id) as st_zapisov_prisotnosti
FROM swimmers s
LEFT JOIN attendance a ON a.swimmer_id = s.id
WHERE 
    (
        s.terms IS NULL 
        OR s.terms::text IN ('[]', 'null', 'NULL')
        OR (jsonb_typeof(s.terms::jsonb) = 'array' AND jsonb_array_length(s.terms::jsonb) = 0)
    )
    AND s.is_deleted = false
GROUP BY s.id, s.first_name, s.last_name
ORDER BY st_zapisov_prisotnosti DESC;

-- Preveri vadnine za plavalce brez terminov
SELECT 
    s.id,
    s.first_name,
    s.last_name,
    COUNT(f.id) as st_zapisov_vadnin
FROM swimmers s
LEFT JOIN fees f ON f.swimmer_id = s.id
WHERE 
    (
        s.terms IS NULL 
        OR array_length(s.terms, 1) IS NULL
        OR array_length(s.terms, 1) = 0
    )
    AND s.is_deleted = false
GROUP BY s.id, s.first_name, s.last_name
ORDER BY st_zapisov_vadnin DESC;

