-- Popravki prepisa junijskih treningov, potrjeni 23. 11. 2026 (samo vrstice, ki jih je trener potrdil).
-- Vse ali nič: če katera vrstica ni točno taka, kot pričakujemo, se nič ne spremeni.
-- Trenerjevih shranjenih treningov (november 2026) se ne dotakne.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  r record;
  n int;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('2026-06-10'::date, '{A}'::text[],   'glavna',    '3X100 SIMULATOR',          '3x( 100 SIMULATOR / 50 RAZP )',        '3X(100 SIMULATOR / 50 RAZP)',        450),
    ('2026-06-10', '{C}',   'vaje',      '8X25 PL M CT P10"',        '8x25 PL H CT p10"',                    '8X25 PL H CT P10"',                  200),
    ('2026-06-11', '{A,B}', 'vaje',      '8X25 PL D 3-3',            '8x25 PL DV 3-3',                       '8X25 PL DV 3-3',                     200),
    ('2026-06-17', '{C}',   'vaje',      '8X25 PL MN 90°',           '8x25 PL HN 90°',                       '8X25 PL HN 90°',                     200),
    ('2026-06-17', '{C}',   'zakljucek', '4X50 DESKA 1XN 1XKN',      '4x50 DESKA 1xPN 1xKN',                 '4X50 DESKA 1XPN 1XKN',               200),
    ('2026-06-18', '{A,B}', 'vaje',      '10X25 PL ↑DN PV ↓M CT',    '10x25 PL ↑DN PV ↓H CT',                '10X25 PL ↑DN PV ↓H CT',              250),
    ('2026-06-24', '{C}',   'vaje',      '8X25 PL PREVAL',           '8x25 PL KN + PREVAL',                  '8X25 PL KN + PREVAL',                200),
    ('2026-06-24', '{C}',   'vaje',      '8X25 PL KN KZ 4X NOGE',    '8x25 PL KZ 4x NORMALNO 4x OBRATNO',    '8X25 PL KZ 4X NORMALNO 4X OBRATNO',  200),
    ('2026-06-24', '{A}',   'ogrevalna', '10X25 PL POČASI + SPRINT', '10x25 PL PREVAL + SPRINT',             '10X25 PL PREVAL + SPRINT',           250)
  ) AS v(d, lv, phase, old_fp, txt, fp, m)
  LOOP
    UPDATE public.training_sets SET text = r.txt, fingerprint = r.fp, meters = r.m, structure = jsonb_build_object('v', 1, 'meters', r.m)
     WHERE trainer_id = o AND phase = r.phase AND fingerprint = r.old_fp;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Serija % / %: % vrstic', r.phase, r.old_fp, n; END IF;

    UPDATE public.training_items i SET text = r.txt, fingerprint = r.fp, meters = r.m, structure = jsonb_build_object('v', 1, 'meters', r.m)
      FROM public.trainings t
     WHERE t.id = i.training_id AND t.trainer_id = o AND t.date = r.d AND t.levels = r.lv
       AND t.notes = 'Uvoz iz zvezka 2026 (pregledano)' AND i.phase = r.phase AND i.fingerprint = r.old_fp;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Postavka % % / %: % vrstic', r.d, r.phase, r.old_fp, n; END IF;
  END LOOP;

  -- 10. 6. A: razplavanje po SIMULATORJU je zdaj del serije (po vsaki ponovitvi)
  DELETE FROM public.training_items i USING public.trainings t
   WHERE t.id = i.training_id AND t.trainer_id = o AND t.date = '2026-06-10' AND t.levels = '{A}'
     AND i.position = 6 AND i.phase = 'vmesno_razplavanje' AND i.fingerprint = '50 RAZP';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '10. 6. A razplavanje: % vrstic', n; END IF;

  -- 24. 6. C: 50 RAZP pred glavno in po njej
  INSERT INTO public.training_items (training_id, position, phase, text, structure, meters, fingerprint)
  SELECT t.id, 6, 'zakljucno_razplavanje', '50 RAZP', '{"v":1,"meters":50}'::jsonb, 50, '50 RAZP'
    FROM public.trainings t
   WHERE t.trainer_id = o AND t.date = '2026-06-24' AND t.levels = '{C}'
     AND NOT EXISTS (SELECT 1 FROM public.training_items i WHERE i.training_id = t.id AND i.position = 6);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '24. 6. C razplavanje: % vrstic', n; END IF;

  UPDATE public.trainings SET total_meters = 2250, estimated_minutes = 32 WHERE trainer_id = o AND date = '2026-06-10' AND levels = '{A}';
  UPDATE public.trainings SET total_meters = 1300, estimated_minutes = 26 WHERE trainer_id = o AND date = '2026-06-24' AND levels = '{C}';
END $$;
