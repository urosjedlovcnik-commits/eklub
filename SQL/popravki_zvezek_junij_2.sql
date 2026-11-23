-- Drugi sklop popravkov, potrjen 23. 11. 2026: junij (10. 6. A, 10. 6. C, 11. 6.) in trening 25. 11. C ("ti popravi").
-- Vse ali nič. Trening 25. 11. A ostane nespremenjen ("lahko pustiš").
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  r record;
  n int;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('2026-06-10'::date, '{A}'::text[], 'vaje', '4X50 PL HV HITLER 1X 2-2-2', '4x50 PL 1x BIONDI 1x 2-2-2', '4X50 PL 1X BIONDI 1X 2-2-2', 200),
    ('2026-06-10', '{A}', 'vaje', '8X25 PL HITRO', '8x25 PL HITLER', '8X25 PL HITLER', 200),
    ('2026-06-10', '{C}', 'glavna', '4X100 M 1X K PL 1X P 1X K 1X P', '4x100 1x K PL 1x P 1x K 1x P', '4X100 1X K PL 1X P 1X K 1X P', 400),
    ('2026-06-11', '{A,B}', 'glavna', E'12X50 3+1 @1''\n6X100 K 2+1 @2''', E'12x50 5+1 @1''\n6x100 K 2+1 @2''', E'12X50 5+1 @1''\n6X100 K 2+1 @2''', 1200)
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

  -- 25. 11. C: DESKA 1xN 1xKN -> 1xPN 1xKN (serija v knjižnici je že popravljena)
  UPDATE public.training_items i SET text = '4x50 DESKA 1xPN 1xKN', fingerprint = '4X50 DESKA 1XPN 1XKN'
    FROM public.trainings t
   WHERE t.id = i.training_id AND t.trainer_id = o AND t.date = '2026-11-25' AND t.levels = '{C}'
     AND i.phase = 'zakljucek' AND i.fingerprint = '4X50 DESKA 1XN 1XKN';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION '25. 11. C: % vrstic', n; END IF;
END $$;
