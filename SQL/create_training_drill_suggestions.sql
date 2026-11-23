-- Predlogi vaj s spleta (video): trener jih pregleda na strani Treningi in potrdi v šifrant.
-- Predlog sam po sebi ni v šifrantu in ga generator ne uporablja.
CREATE TABLE IF NOT EXISTS public.training_drill_suggestions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id  uuid NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  code        text NOT NULL CHECK (length(trim(code)) > 0),
  title       text NOT NULL,
  stroke      text CHECK (stroke IN ('P', 'K', 'H', 'D', 'M')),
  description text NOT NULL,
  why         text,
  video_url   text NOT NULL CHECK (video_url LIKE 'https://%'),
  source_url  text CHECK (source_url LIKE 'https://%'),
  status      text NOT NULL DEFAULT 'predlog' CHECK (status IN ('predlog', 'potrjen', 'zavrnjen')),
  decided_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, video_url)
);
CREATE INDEX IF NOT EXISTS training_drill_suggestions_status_idx ON public.training_drill_suggestions (trainer_id, status);

ALTER TABLE public.training_drill_suggestions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.training_drill_suggestions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_drill_suggestions TO authenticated;
DROP POLICY IF EXISTS training_drill_suggestions_own ON public.training_drill_suggestions;
CREATE POLICY training_drill_suggestions_own ON public.training_drill_suggestions
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR trainer_id = public.current_trainer_id())
  WITH CHECK (public.is_super_admin() OR trainer_id = public.current_trainer_id());

-- Na kateri razdalji se vaja plava: {25} ali {25,50}. Prazno = ni določeno.
ALTER TABLE public.training_codes ADD COLUMN IF NOT EXISTS distances integer[] NOT NULL DEFAULT '{}'
  CHECK (distances <@ ARRAY[25, 50]);

-- Prvi predlogi (23. 11. 2026)
INSERT INTO public.training_drill_suggestions (trainer_id, code, title, stroke, description, why, video_url, source_url)
SELECT t.id, v.code, v.title, v.stroke, v.description, v.why, v.video_url, v.source_url
FROM public.trainers t, (VALUES
  ('DN 360', '360 Dolphin Kick', 'D', 'Delfin noge pod vodo v iztegnjenem položaju s počasnim obratom okoli svoje osi.', 'Udarec v vseh smereh; pokaže šibkejšo stran.', 'https://www.youtube.com/watch?v=I5vDKB-5-rA', 'https://www.swimmingworldmagazine.com/news/wp-json/wp/v2/posts/199386'),
  ('D 3S', 'Hesitation Butterfly', 'D', 'Trije udarci s scullingom spredaj, nato en močan zavesljaj in spet od začetka.', 'Dolžina zavesljaja in občutek plavanja navzdol.', 'https://www.youtube.com/watch?v=XmKJB2-qDDA', 'https://www.swimmingworldmagazine.com/news/fitter-and-faster-drill-of-the-week-3-kick-hesitation-butterfly-with-olympian-elaine-breeden/'),
  ('BOOM', 'Boom Drill', 'D', 'Po potegu roke ostanejo ob bokih, s prsmi se potopiš, roke gredo naprej pod vodo. Podobno kot ORKA in BIONDI.', 'Valovanje telesa, pritisk prsi in moč potega.', 'https://www.youtube.com/watch?v=VqMGJIk9MDc', 'https://www.swimmingworldmagazine.com/news/fitter-and-faster-drill-of-the-week-boom-drill-2/'),
  ('2D-2P', 'Short Axis Combo', 'D', 'Izmenično 2 cikla delfina in 2 cikla prsnega s čim bolj tekočim prehodom.', 'Valovanje naprej pri delfinu in prsnem.', 'https://www.youtube.com/watch?v=HAn3nj-vpUA', 'https://www.swimmingworldmagazine.com/news/fitter-and-faster-swim-drill-of-the-week-short-axis-combo/'),
  ('H SPIN', 'Backstroke Spin Drill', 'H', 'Hrbtno s čim hitrejšim vrtenjem iztegnjenih rok, dlani odprte ali zaprte.', 'Frekvenca zavesljaja pri hrbtnem.', 'https://vimeo.com/170519693', 'https://vimeo.com/170519693')
) AS v(code, title, stroke, description, why, video_url, source_url)
WHERE t.email = 'uros.jedlovcnik@gmail.com'
ON CONFLICT (trainer_id, video_url) DO NOTHING;
