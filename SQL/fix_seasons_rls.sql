-- ===== RLS ZA TABELO seasons =====
-- Poženi v Supabase SQL Editor, če dobiš:
-- "new row violates row-level security policy for table seasons"

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Odstrani morebitno nepopolno pravilo (npr. samo SELECT)
DROP POLICY IF EXISTS "Allow public access" ON public.seasons;

-- Dostop za ključ anon (javna stran) in authenticated (prijavljeni)
-- WITH CHECK je obvezen za INSERT/UPDATE novih vrstic
CREATE POLICY "Allow public access" ON public.seasons
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
