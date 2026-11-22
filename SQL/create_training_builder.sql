-- Sistem za sestavljanje treningov (gl. PLAN_TRENINGI.md)
-- Poženite v Supabase SQL Editor. Skripta je ponovljiva (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Predpogoj: phase2_rls_security.sql (funkciji current_trainer_id() in is_super_admin()).
-- Nato poženite še seed_training_codes.sql.

-- ===== Preverjanje predpogojev =====

DO $$
BEGIN
  IF to_regprocedure('public.current_trainer_id()') IS NULL
     OR to_regprocedure('public.is_super_admin()') IS NULL THEN
    RAISE EXCEPTION 'Manjkata funkciji current_trainer_id() / is_super_admin(). Najprej poženite SQL/phase2_rls_security.sql.';
  END IF;
END $$;

-- ===== Skupne funkcije =====

CREATE OR REPLACE FUNCTION public.training_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ===== 1. Šifrant kratic (skupen za klub, živ) =====

CREATE TABLE IF NOT EXISTS public.training_codes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL CHECK (length(trim(code)) > 0),
  meaning       text NOT NULL,
  category      text NOT NULL CHECK (category IN (
                  'tehnika', 'izpeljava', 'rekvizit', 'intenzivnost',
                  'stopnjevanje', 'vaja', 'drugo')),
  stroke        text CHECK (stroke IN ('P', 'K', 'H', 'D', 'M')),
  variant       text CHECK (variant IN ('cela', 'vaje', 'noge')),
  takes_params  boolean NOT NULL DEFAULT false,
  explanation   text,
  aliases       text[] NOT NULL DEFAULT '{}',
  rarely_used   boolean NOT NULL DEFAULT false,
  drill_type    text,
  equipment     text[] NOT NULL DEFAULT '{}',
  levels        text[] NOT NULL DEFAULT '{}' CHECK (levels <@ ARRAY['A', 'B', 'C']),
  video_url     text,
  active        boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.trainers(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS training_codes_code_uq ON public.training_codes (lower(code));
CREATE INDEX IF NOT EXISTS training_codes_category_idx ON public.training_codes (category);

DROP TRIGGER IF EXISTS training_codes_touch ON public.training_codes;
CREATE TRIGGER training_codes_touch BEFORE UPDATE ON public.training_codes
  FOR EACH ROW EXECUTE FUNCTION public.training_touch_updated_at();

-- ===== 2. Knjižnica serij (na trenerja) =====

CREATE TABLE IF NOT EXISTS public.training_sets (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id   uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  phase        text NOT NULL CHECK (phase IN (
                 'razplavanje', 'ogrevalna', 'vaje', 'vmesno_razplavanje',
                 'glavna', 'zakljucek', 'zakljucno_razplavanje')),
  main_type    text,
  levels       text[] NOT NULL DEFAULT '{A}' CHECK (cardinality(levels) > 0 AND levels <@ ARRAY['A', 'B', 'C']),
  text         text NOT NULL,
  structure    jsonb NOT NULL,
  meters       integer NOT NULL CHECK (meters >= 0),
  fingerprint  text NOT NULL,
  notes        text,
  source       text NOT NULL DEFAULT 'rocno' CHECK (source IN ('rocno', 'uvoz', 'ai')),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, phase, fingerprint)
);

CREATE INDEX IF NOT EXISTS training_sets_trainer_phase_idx ON public.training_sets (trainer_id, phase);

DROP TRIGGER IF EXISTS training_sets_touch ON public.training_sets;
CREATE TRIGGER training_sets_touch BEFORE UPDATE ON public.training_sets
  FOR EACH ROW EXECUTE FUNCTION public.training_touch_updated_at();

-- ===== 3. Treningi =====

CREATE TABLE IF NOT EXISTS public.trainings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id         uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  term_id            text REFERENCES public.terms(id) ON DELETE SET NULL,
  date               date NOT NULL,
  -- Shranjeno urejeno (npr. {A,B}); skupina nivojev, ki plava ta trening.
  levels             text[] NOT NULL CHECK (cardinality(levels) > 0 AND levels <@ ARRAY['A', 'B', 'C']),
  status             text NOT NULL DEFAULT 'osnutek' CHECK (status IN ('osnutek', 'potrjen', 'izveden')),
  order_variant      text NOT NULL DEFAULT 'obicajni' CHECK (order_variant IN ('obicajni', 'glavna_takoj')),
  total_meters       integer,
  estimated_minutes  integer,
  notes              text,
  confirmed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- En trening na trenerja + termin + datum + skupino nivojev (v sredo: {A} in {C}).
CREATE UNIQUE INDEX IF NOT EXISTS trainings_slot_uq
  ON public.trainings (trainer_id, coalesce(term_id, ''), date, levels);
CREATE INDEX IF NOT EXISTS trainings_trainer_date_idx ON public.trainings (trainer_id, date DESC);

DROP TRIGGER IF EXISTS trainings_touch ON public.trainings;
CREATE TRIGGER trainings_touch BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.training_touch_updated_at();

-- ===== 4. Bloki treninga (kopija serije ob času uporabe) =====

CREATE TABLE IF NOT EXISTS public.training_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id     uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  position        integer NOT NULL,
  phase           text NOT NULL CHECK (phase IN (
                    'razplavanje', 'ogrevalna', 'vaje', 'vmesno_razplavanje',
                    'glavna', 'zakljucek', 'zakljucno_razplavanje')),
  set_id          uuid REFERENCES public.training_sets(id) ON DELETE SET NULL,
  text            text NOT NULL,
  structure       jsonb NOT NULL,
  meters          integer NOT NULL CHECK (meters >= 0),
  fingerprint     text NOT NULL,
  -- Npr. {"B": {"text": "5x100 K @1'50\"", "reps": 5}}
  level_variants  jsonb NOT NULL DEFAULT '{}',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_items_training_idx ON public.training_items (training_id, position);
CREATE INDEX IF NOT EXISTS training_items_fingerprint_idx ON public.training_items (fingerprint) WHERE phase = 'glavna';

-- ===== 5. Nastavitve trenerja (razponi, tempo, pravila) =====

CREATE TABLE IF NOT EXISTS public.training_settings (
  trainer_id  uuid PRIMARY KEY REFERENCES public.trainers(id) ON DELETE CASCADE,
  settings    jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS training_settings_touch ON public.training_settings;
CREATE TRIGGER training_settings_touch BEFORE UPDATE ON public.training_settings
  FOR EACH ROW EXECUTE FUNCTION public.training_touch_updated_at();

-- ===== 6. Uporaba glavnih serij (za pravilo 2 mesecev) =====
-- security_invoker: pogled upošteva RLS klicatelja.

CREATE OR REPLACE VIEW public.training_main_set_usage
WITH (security_invoker = true) AS
SELECT
  t.trainer_id,
  lvl AS level,
  i.fingerprint,
  max(t.date) AS last_used,
  count(*)    AS times_used
FROM public.training_items i
JOIN public.trainings t ON t.id = i.training_id
CROSS JOIN LATERAL unnest(t.levels) AS lvl
WHERE i.phase = 'glavna'
  AND t.status IN ('potrjen', 'izveden')
GROUP BY t.trainer_id, lvl, i.fingerprint;

-- ===== 7. RLS =====

ALTER TABLE public.training_codes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.training_codes, public.training_sets, public.trainings,
              public.training_items, public.training_settings,
              public.training_main_set_usage FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_codes, public.training_sets,
              public.trainings, public.training_items, public.training_settings TO authenticated;
GRANT SELECT ON public.training_main_set_usage TO authenticated;

-- Šifrant: bere ga vsak prijavljen trener; ureja avtor kratice ali super_admin; briše samo super_admin
-- (običajno se kratica deaktivira, ker je uporabljena v starih treningih).
DROP POLICY IF EXISTS training_codes_select ON public.training_codes;
CREATE POLICY training_codes_select ON public.training_codes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS training_codes_insert ON public.training_codes;
CREATE POLICY training_codes_insert ON public.training_codes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin() OR created_by = public.current_trainer_id());

DROP POLICY IF EXISTS training_codes_update ON public.training_codes;
CREATE POLICY training_codes_update ON public.training_codes
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR created_by = public.current_trainer_id())
  WITH CHECK (public.is_super_admin() OR created_by = public.current_trainer_id());

DROP POLICY IF EXISTS training_codes_delete ON public.training_codes;
CREATE POLICY training_codes_delete ON public.training_codes
  FOR DELETE TO authenticated USING (public.is_super_admin());

-- Serije, treningi, nastavitve: samo lastnik (ali super_admin).
DROP POLICY IF EXISTS training_sets_own ON public.training_sets;
CREATE POLICY training_sets_own ON public.training_sets
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR trainer_id = public.current_trainer_id())
  WITH CHECK (public.is_super_admin() OR trainer_id = public.current_trainer_id());

DROP POLICY IF EXISTS trainings_own ON public.trainings;
CREATE POLICY trainings_own ON public.trainings
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR trainer_id = public.current_trainer_id())
  WITH CHECK (public.is_super_admin() OR trainer_id = public.current_trainer_id());

DROP POLICY IF EXISTS training_settings_own ON public.training_settings;
CREATE POLICY training_settings_own ON public.training_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR trainer_id = public.current_trainer_id())
  WITH CHECK (public.is_super_admin() OR trainer_id = public.current_trainer_id());

-- Bloki: dostop prek pripadajočega treninga.
DROP POLICY IF EXISTS training_items_own ON public.training_items;
CREATE POLICY training_items_own ON public.training_items
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trainings t
    WHERE t.id = training_id
      AND (public.is_super_admin() OR t.trainer_id = public.current_trainer_id())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trainings t
    WHERE t.id = training_id
      AND (public.is_super_admin() OR t.trainer_id = public.current_trainer_id())
  ));
