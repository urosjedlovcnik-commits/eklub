-- Odgovori 25. 11. 2026: STEGR (RRU ali normalna tehnika), RS, DZ; 19. 11. 2025 A: H 90° -> HN 90°. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  novi uuid;
  stari uuid;
  n int;
BEGIN
  UPDATE public.training_codes SET meaning = 'stegnjene roke (RRU ali normalna tehnika)' WHERE code = 'STEGR';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'STEGR: %', n; END IF;

  INSERT INTO public.training_codes (code, meaning, category, stroke, created_by)
  SELECT v.code, v.meaning, v.category, NULL, o FROM (VALUES
    ('RS', 'roke spredaj (noge na trebuhu)', 'vaja'),
    ('DZ', 'delfin zavesljaji (npr. tja desna, nazaj leva)', 'vaja')
  ) AS v(code, meaning, category)
  WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = lower(v.code));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Nove kratice: %', n; END IF;

  SELECT id INTO STRICT novi FROM public.training_sets WHERE trainer_id = o AND phase = 'vaje' AND fingerprint = '8X25 PL HN 90°';
  SELECT i.set_id INTO STRICT stari FROM public.training_items i JOIN public.trainings t ON t.id = i.training_id
   WHERE t.trainer_id = o AND t.date = '2025-11-19' AND i.text = '8x25 PL H 90°';
  UPDATE public.training_items SET text = '8x25 PL HN 90°', fingerprint = '8X25 PL HN 90°', set_id = novi WHERE set_id = stari;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'H 90: %', n; END IF;
  UPDATE public.training_sets SET levels = (SELECT array_agg(DISTINCT u ORDER BY u) FROM unnest(levels || ARRAY['A']) u) WHERE id = novi;
  DELETE FROM public.training_sets WHERE id = stari;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'Stara serija: %', n; END IF;
END $$;
