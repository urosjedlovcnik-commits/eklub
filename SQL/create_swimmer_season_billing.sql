-- Način plačila plavalca na sezono (mesečno / enkratno / 2 obroka)
-- Poženite v Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.swimmer_season_billing (
    swimmer_id UUID NOT NULL REFERENCES public.swimmers(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    payment_plan TEXT NOT NULL DEFAULT 'monthly'
        CHECK (payment_plan IN ('monthly', 'lump_sum', 'two_installments')),
    include_membership_fee BOOLEAN NOT NULL DEFAULT false,
    membership_charged_month INTEGER
        CHECK (membership_charged_month IS NULL OR (membership_charged_month >= 1 AND membership_charged_month <= 12)),
    membership_charged_year INTEGER
        CHECK (membership_charged_year IS NULL OR membership_charged_year >= 2000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (swimmer_id, season_id)
);

CREATE INDEX IF NOT EXISTS idx_swimmer_season_billing_season
    ON public.swimmer_season_billing (season_id);

COMMENT ON TABLE public.swimmer_season_billing IS
    'Način plačila plavalca za sezono. Zneske vnašate ročno v swimmer_monthly_fees.';
COMMENT ON COLUMN public.swimmer_season_billing.payment_plan IS
    'monthly = mesečno, lump_sum = enkratno (obračun oktober), two_installments = 2 obroka (oktober + februar)';
COMMENT ON COLUMN public.swimmer_season_billing.membership_charged_month IS
    'Mesec obračuna članarine (1-12); enkrat na sezono. NULL = članarine ne plača.';

-- Aplikacija uporablja anon ključ (admin prijava je zunaj Supabase Auth),
-- zato mora policy dovoliti tudi anon, sicer INSERT/UPDATE vrne napako 42501.
ALTER TABLE public.swimmer_season_billing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "swimmer_season_billing_admin_access" ON public.swimmer_season_billing;
DROP POLICY IF EXISTS "Allow public access" ON public.swimmer_season_billing;
CREATE POLICY "Allow public access" ON public.swimmer_season_billing
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

DROP TRIGGER IF EXISTS update_swimmer_season_billing_updated_at ON public.swimmer_season_billing;
CREATE TRIGGER update_swimmer_season_billing_updated_at
    BEFORE UPDATE ON public.swimmer_season_billing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
