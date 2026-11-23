-- Spremembe treningov 23.–26. 11. 2026 in kratica RV -> RV 90°, kot jih je potrdil trener 23. 11. 2026. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  r record;
  n int;
  sid uuid;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('2026-11-23'::date, '{A,B}'::text[], 'vaje', '4X50 PL KN', '4x50 PL KN RV 90°', '4X50 PL KN RV 90°', 200, NULL::text),
    ('2026-11-25', '{A}', 'vaje', '4X50 PL SHARK 1/SHARK 2', '8x25 PL ↑HN ROTACIJA ↓K 6-3-6', '8X25 PL ↑HN ROTACIJA ↓K 6-3-6', 200, NULL),
    ('2026-11-25', '{A}', 'glavna', E'6X50 KVL @1''\n6X50 PL MAX NOGE @1''10"\n6X50 @50"\n6X50 KVL @1''',
       E'6x50 KVL @1''\n6x50 PL NOGE 1x MAX 1x EASY @1''10"\n6x50 @50"\n6x50 KVL @1''',
       E'6X50 KVL @1''\n6X50 PL NOGE 1X MAX 1X EASY @1''10"\n6X50 @50"\n6X50 KVL @1''', 1200, NULL),
    ('2026-11-26', '{A,B}', 'vaje', '6X50 1X DN BOK 1X DV 1-1-2', '12x25 PL 1x DN BOK 1x DV 1-1-2', '12X25 PL 1X DN BOK 1X DV 1-1-2', 300, NULL),
    ('2026-11-26', '{A,B}', 'glavna', '4X(100 / 50 / 50 RAZP) 1X VL 1X K 1X M 1X K',
       '4x( 100 @2'' / 50 @1'' / 50 RAZP ) 1x VL 1x K 1x 100 M + 50 STIL 1x K',
       '4X(100 @2'' / 50 @1'' / 50 RAZP) 1X VL 1X K 1X 100 M + 50 STIL 1X K', 800,
       '3x( 100 @2'' / 50 @1'' / 50 RAZP ) 1x VL 1x K 1x 100 M + 50 STIL')
  ) AS v(d, lv, phase, old_fp, txt, fp, m, b)
  LOOP
    INSERT INTO public.training_sets (trainer_id, phase, levels, text, structure, meters, fingerprint, source)
    VALUES (o, r.phase, r.lv, r.txt, jsonb_build_object('v', 1, 'meters', r.m), r.m, r.fp, 'ai')
    ON CONFLICT (trainer_id, phase, fingerprint) DO NOTHING;
    SELECT id INTO STRICT sid FROM public.training_sets WHERE trainer_id = o AND phase = r.phase AND fingerprint = r.fp;

    UPDATE public.training_items i
       SET text = r.txt, fingerprint = r.fp, meters = r.m, structure = jsonb_build_object('v', 1, 'meters', r.m), set_id = sid, notes = NULL,
           level_variants = CASE WHEN r.b IS NULL THEN i.level_variants ELSE jsonb_build_object('B', jsonb_build_object('text', r.b)) END
      FROM public.trainings t
     WHERE t.id = i.training_id AND t.trainer_id = o AND t.date = r.d AND t.levels = r.lv AND i.phase = r.phase AND i.fingerprint = r.old_fp;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Trening % % / %: % vrstic', r.d, r.lv, r.old_fp, n; END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.trainings t WHERE t.trainer_id = o AND t.date BETWEEN '2026-11-23' AND '2026-11-26'
             AND t.total_meters <> (SELECT sum(i.meters) FROM public.training_items i WHERE i.training_id = t.id)) THEN
    RAISE EXCEPTION 'Vsota metrov se ne ujema';
  END IF;

  UPDATE public.training_codes SET code = 'RV 90°', meaning = 'roka ven, 90° (npr. KN RV 90°)', aliases = ARRAY['RV'] WHERE code = 'RV';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'RV: % vrstic', n; END IF;
END $$;
