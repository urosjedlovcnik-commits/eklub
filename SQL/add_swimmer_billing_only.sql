-- Osebe za obračun brez dodeljenih terminov (plačilo prek društva / druga oseba)
ALTER TABLE public.swimmer_season_billing
  ADD COLUMN IF NOT EXISTS billing_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.swimmer_season_billing.billing_only IS
  'Vključi v obračun/vadnine tudi brez dodeljenih terminov (npr. plačilo prek društva).';
