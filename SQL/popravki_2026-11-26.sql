-- Potrjeno 25. 11. 2026: VATERPOLO ŠPRICANJE -> VATERPOLO STEGR; 26. 11. brez 4x50 K RRU PESTI (serija ostane v knjižnici). Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  t uuid;
  n int;
  m int;
BEGIN
  UPDATE public.training_sets SET text = replace(text, 'VATERPOLO ŠPRICANJE', 'VATERPOLO STEGR'), fingerprint = replace(fingerprint, 'VATERPOLO ŠPRICANJE', 'VATERPOLO STEGR'),
         structure = replace(structure::text, '"ŠPRICANJE"', '"STEGR"')::jsonb
   WHERE trainer_id = o AND text LIKE '%VATERPOLO ŠPRICANJE%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Serije: %', n; END IF;
  UPDATE public.training_items i SET text = replace(i.text, 'VATERPOLO ŠPRICANJE', 'VATERPOLO STEGR'), fingerprint = replace(i.fingerprint, 'VATERPOLO ŠPRICANJE', 'VATERPOLO STEGR'),
         structure = replace(i.structure::text, '"ŠPRICANJE"', '"STEGR"')::jsonb
    FROM public.trainings x WHERE x.id = i.training_id AND x.trainer_id = o AND i.text LIKE '%VATERPOLO ŠPRICANJE%';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Postavke: %', n; END IF;

  SELECT id INTO STRICT t FROM public.trainings WHERE trainer_id = o AND date = '2026-11-26' AND levels = '{A,B}';
  DELETE FROM public.training_items WHERE training_id = t AND phase = 'vaje' AND text = '4x50 K RRU PESTI';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'PESTI: %', n; END IF;
  UPDATE public.training_items SET position = position - 1 WHERE training_id = t AND position > 4;
  SELECT sum(meters), count(*) INTO m, n FROM public.training_items WHERE training_id = t;
  IF m <> 2200 OR n <> 7 THEN RAISE EXCEPTION 'Metri: %, postavke: %', m, n; END IF;
  UPDATE public.trainings SET total_meters = 2200, estimated_minutes = 31 WHERE id = t;
END $$;
