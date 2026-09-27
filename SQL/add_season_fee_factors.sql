-- Faktorji delnega meseca + (opcijsko) že obstaja first_invoice_offset_months
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS start_month_fee_factor NUMERIC(4,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS end_month_fee_factor NUMERIC(4,2) NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.seasons.start_month_fee_factor IS
  'Množitelj mesečne vadnine v prvem mesecu sezone (0.5 = polovica, npr. od 15.)';
COMMENT ON COLUMN public.seasons.end_month_fee_factor IS
  'Množitelj mesečne vadnine v zadnjem mesecu sezone (0.5 = polovica, npr. do 15.)';
