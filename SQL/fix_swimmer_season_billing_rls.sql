-- POPRAVEK 1: shranjevanje načina plačila/članarine je vračalo napako
--   "new row violates row-level security policy" (koda 42501).
--   Vzrok: policy je zahteval auth.role() = 'authenticated', aplikacija pa uporablja anon ključ.
-- POPRAVEK 2: članarina se obračuna enkrat na sezono, v mesecu ki ga izberete.
-- Poženite v Supabase SQL Editor.

ALTER TABLE public.swimmer_season_billing
    ADD COLUMN IF NOT EXISTS include_membership_fee BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.swimmer_season_billing
    ADD COLUMN IF NOT EXISTS membership_charged_month INTEGER
        CHECK (membership_charged_month IS NULL OR (membership_charged_month >= 1 AND membership_charged_month <= 12));

ALTER TABLE public.swimmer_season_billing
    ADD COLUMN IF NOT EXISTS membership_charged_year INTEGER
        CHECK (membership_charged_year IS NULL OR membership_charged_year >= 2000);

COMMENT ON COLUMN public.swimmer_season_billing.membership_charged_month IS
    'Mesec obračuna članarine (1-12). NULL = članarina se ne obračuna.';
COMMENT ON COLUMN public.swimmer_season_billing.membership_charged_year IS
    'Leto obračuna članarine. NULL = članarina se ne obračuna.';

ALTER TABLE public.swimmer_season_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swimmer_season_billing_admin_access" ON public.swimmer_season_billing;
DROP POLICY IF EXISTS "Allow public access" ON public.swimmer_season_billing;

CREATE POLICY "Allow public access" ON public.swimmer_season_billing
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
