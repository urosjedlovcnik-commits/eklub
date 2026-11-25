-- Odgovori 25. 11. 2026 (maj 2026): LOKOMOTIVA, ROTACIJA ZAPESTJA. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  n int;
BEGIN
  UPDATE public.training_codes SET meaning = 'izmenjajoče plavanje: prvi odplava razdaljo na polno (A 50, B 25), počaka in gre na zadnje mesto' WHERE code = 'LOKOMOTIVA';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'LOKOMOTIVA: %', n; END IF;
  INSERT INTO public.training_codes (code, meaning, category, stroke, created_by)
  SELECT 'ROTACIJA ZAPESTJA', 'HV RRU: rotacija zapestja, medtem ko pelješ roko nazaj nad gladino', 'vaja', NULL, o
  WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = 'rotacija zapestja');
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'ROTACIJA ZAPESTJA: %', n; END IF;
END $$;
