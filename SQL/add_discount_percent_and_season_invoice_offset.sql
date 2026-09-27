-- Popust v % ali € + zamik prvega računa glede na začetek sezone
-- Poženite v Supabase SQL Editor.

ALTER TABLE public.swimmer_monthly_fees
    ADD COLUMN IF NOT EXISTS discount_is_percent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.swimmer_monthly_fees.discount_is_percent IS
    'true = stolpec discount je odstotek vadnine; false = znesek v €';

ALTER TABLE public.seasons
    ADD COLUMN IF NOT EXISTS first_invoice_offset_months INTEGER NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.seasons.first_invoice_offset_months IS
    'Koliko mesecev po mesecu začetka sezone gre prvi račun (0 = isti mesec, 1 = npr. sept→okt).';
