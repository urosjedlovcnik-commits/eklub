-- ===== USTVARJANJE TABELE ZA DODELITVE PLAVALCEV TERMINOM Z DATUMI =====
-- Ta skript ustvari novo tabelo za shranjevanje datumov dodelitve plavalcev terminom

-- 1. USTVARI TABELO ZA DODELITVE PLAVALCEV TERMINOM
CREATE TABLE IF NOT EXISTS "public"."swimmer_term_assignments" (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "swimmer_id" UUID NOT NULL REFERENCES "public"."swimmers"("id") ON DELETE CASCADE,
    "term_id" TEXT NOT NULL REFERENCES "public"."terms"("id") ON DELETE CASCADE,
    "assigned_from_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "assigned_to_date" DATE NULL,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(swimmer_id, term_id, assigned_from_date),
    CONSTRAINT check_assigned_dates CHECK (assigned_to_date IS NULL OR assigned_to_date >= assigned_from_date)
);

-- 2. DODAJ INDEKSE ZA HITREJŠE ISKANJE
CREATE INDEX IF NOT EXISTS idx_swimmer_term_assignments_swimmer_id ON "public"."swimmer_term_assignments"("swimmer_id");
CREATE INDEX IF NOT EXISTS idx_swimmer_term_assignments_term_id ON "public"."swimmer_term_assignments"("term_id");
CREATE INDEX IF NOT EXISTS idx_swimmer_term_assignments_dates ON "public"."swimmer_term_assignments"("assigned_from_date", "assigned_to_date");

-- 3. MIGRIRAJ OBSTOJEČE PODATKE
-- Za vse plavalce, ki imajo dodeljene termine, ustvari zapise v novi tabeli
-- Predpostavimo, da so vsi plavalci dodeljeni od začetka terminov (date_from)
INSERT INTO "public"."swimmer_term_assignments" ("swimmer_id", "term_id", "assigned_from_date")
SELECT DISTINCT
    s.id as swimmer_id,
    term_id::text as term_id,
    COALESCE(
        (SELECT MIN(t.date_from::date) FROM "public"."terms" t WHERE t.id = term_id::text),
        CURRENT_DATE
    ) as assigned_from_date
FROM "public"."swimmers" s
CROSS JOIN LATERAL unnest(s.terms) AS term_id
WHERE s.terms IS NOT NULL 
  AND array_length(s.terms, 1) > 0
  AND s.is_deleted = false
  AND NOT EXISTS (
      SELECT 1 FROM "public"."swimmer_term_assignments" sta
      WHERE sta.swimmer_id = s.id 
        AND sta.term_id = term_id::text
  )
ON CONFLICT (swimmer_id, term_id, assigned_from_date) DO NOTHING;

-- 4. PREVERI REZULTAT MIGRACIJE
SELECT 
    'Migracija podatkov' as info,
    COUNT(*) as stevilo_dodelitev,
    COUNT(DISTINCT swimmer_id) as stevilo_plavalcev,
    COUNT(DISTINCT term_id) as stevilo_terminov
FROM "public"."swimmer_term_assignments";

-- 5. PREVERI PRIMERE DODELITEV
SELECT 
    s.first_name,
    s.last_name,
    sta.term_id,
    sta.assigned_from_date,
    sta.assigned_to_date,
    t.date_from as term_date_from,
    t.date_to as term_date_to
FROM "public"."swimmer_term_assignments" sta
JOIN "public"."swimmers" s ON s.id = sta.swimmer_id
LEFT JOIN "public"."terms" t ON t.id = sta.term_id
WHERE s.is_deleted = false
ORDER BY s.last_name, s.first_name, sta.term_id
LIMIT 20;

