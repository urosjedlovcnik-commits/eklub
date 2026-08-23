-- ===== SEZONE: tabela in povezava na termine =====
-- Poženite v Supabase SQL Editor. Nato v aplikaciji dodajte sezone in pri novih terminih izberite sezono.

CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT seasons_dates CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS idx_seasons_dates ON public.seasons (date_from, date_to);
CREATE INDEX IF NOT EXISTS idx_seasons_active ON public.seasons (is_active);

ALTER TABLE public.terms
    ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_terms_season_id ON public.terms (season_id);

COMMENT ON TABLE public.seasons IS 'Plavalna sezona (npr. 2025/26); termini so vezani preko terms.season_id';
COMMENT ON COLUMN public.terms.season_id IS 'Opcijsko: termin pripada tej sezoni (za poročila in filtre)';

-- Enkratna migracija: ena privzeta sezona iz obstoječih terminov (samo če so termini in še ni sezon)
INSERT INTO public.seasons (name, date_from, date_to, is_active)
SELECT 'Privzeta sezona (migracija)', x.min_d, x.max_d, true
FROM (
    SELECT MIN(date_from::date) AS min_d, MAX(date_to::date) AS max_d
    FROM public.terms
) x
WHERE NOT EXISTS (SELECT 1 FROM public.seasons LIMIT 1)
  AND x.min_d IS NOT NULL
  AND x.max_d IS NOT NULL;

UPDATE public.terms t
SET season_id = (SELECT id FROM public.seasons ORDER BY date_from LIMIT 1)
WHERE t.season_id IS NULL
  AND EXISTS (SELECT 1 FROM public.seasons LIMIT 1);

-- RLS (Supabase privzeto zavrača INSERT brez policy-ja z WITH CHECK)
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public access" ON public.seasons;

CREATE POLICY "Allow public access" ON public.seasons
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);
