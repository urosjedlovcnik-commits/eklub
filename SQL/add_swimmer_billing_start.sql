-- Začetek obračuna po plavalcu (prva vadnina + članarina v tistem mesecu)
ALTER TABLE public.swimmer_season_billing
  ADD COLUMN IF NOT EXISTS billing_start_month INT,
  ADD COLUMN IF NOT EXISTS billing_start_year INT;

COMMENT ON COLUMN public.swimmer_season_billing.billing_start_month IS
  'Mesec začetka v sezoni (prva vadnina + članarina); NULL = od začetka sezone / 1. računa';
COMMENT ON COLUMN public.swimmer_season_billing.billing_start_year IS
  'Leto začetka obračuna plavalca v sezoni';
