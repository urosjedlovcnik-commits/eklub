-- Članarina po plavalcu in sezoni (poleg globalnega gumba v poročilu)
-- Poženite v Supabase SQL Editor (tabela swimmer_season_billing mora že obstajati).

ALTER TABLE public.swimmer_season_billing
    ADD COLUMN IF NOT EXISTS include_membership_fee BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.swimmer_season_billing.include_membership_fee IS
    'Ali se plavalcu pri poročilu za računovodstvo prišteje članarina (30 €). Nastavite globalno ali posamezno.';
