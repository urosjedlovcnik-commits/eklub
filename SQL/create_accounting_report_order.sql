-- Vrstni red plavalcev v mesečnem poročilu za računovodstvo (po sezoni)
-- Poženite v Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.accounting_report_swimmer_order (
    season_id UUID NOT NULL REFERENCES public.seasons (id) ON DELETE CASCADE,
    swimmer_id UUID NOT NULL REFERENCES public.swimmers (id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (season_id, swimmer_id)
);

CREATE INDEX IF NOT EXISTS idx_accounting_report_order_season
    ON public.accounting_report_swimmer_order (season_id, sort_order);

COMMENT ON TABLE public.accounting_report_swimmer_order IS
    'Ročno urejen vrstni red plavalcev v poročilu za računovodstvo (zavihek Finance)';

ALTER TABLE public.accounting_report_swimmer_order ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON public.accounting_report_swimmer_order;

CREATE POLICY "Allow public access" ON public.accounting_report_swimmer_order
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
