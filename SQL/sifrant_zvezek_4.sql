-- Šifrant, odgovori 25. 11. 2026: ROKE (namesto PROKE), KOMB, STEGR je RRU vaja. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  n int;
BEGIN
  UPDATE public.training_codes SET meaning = 'RRU: stegnjene roke' WHERE code = 'STEGR';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'STEGR: %', n; END IF;
  INSERT INTO public.training_codes (code, meaning, category, stroke, created_by)
  SELECT v.code, v.meaning, v.category, NULL, o FROM (VALUES
    ('ROKE', 'samo roke, noge popolnoma pri miru', 'izpeljava'),
    ('KOMB', 'noge: med plavanjem menjaš položaj telesa (npr. DN KOMB)', 'vaja')
  ) AS v(code, meaning, category)
  WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = lower(v.code));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Nove kratice: %', n; END IF;
END $$;
