-- Odgovori 25. 11. 2026: šifrant in dva popravka uvoženih vaj (19. 11. in 26. 11. 2025 A). Nič se ne briše. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  r record;
  n int;
BEGIN
  UPDATE public.training_codes c SET meaning = v.m FROM (VALUES
    ('STEGR', 'stegnjene roke (RRU ali normalna tehnika)'),
    ('1-1', 'prsno: ločeno roke, ločeno noge (lahko enkrat z vdihom, enkrat brez); KV 1-1: ena roka gor, druga dol in menjaš (redko)')
  ) v(k, m) WHERE c.code = v.k;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 2 THEN RAISE EXCEPTION 'Pomeni: %', n; END IF;

  INSERT INTO public.training_codes (code, meaning, category, stroke, created_by)
  SELECT v.code, v.meaning, v.category, NULL, o FROM (VALUES
    ('RS', 'roke spredaj (noge na trebuhu)', 'vaja'),
    ('DZ', 'delfin zavesljaji (npr. tja desna, nazaj leva)', 'vaja'),
    ('POUDAREK PDZ', 'KV: poudarek na prvem (prednjem) delu zavesljaja', 'vaja'),
    ('1-1-1', 'prsno: 1 zavesljaj z eno roko, 1 z drugo, ena cela koordinacija', 'vaja')
  ) AS v(code, meaning, category)
  WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = lower(v.code));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 4 THEN RAISE EXCEPTION 'Nove kratice: %', n; END IF;

  FOR r IN SELECT * FROM (VALUES
    ('8x25 PL H 90°', '8x25 PL HV RRU 90°', '8X25 PL HV RRU 90°'),
    ('10x25 PL 1x DN H PV + H 1x KN BOK RZ', '10x25 PL 1x DN H PV + H 1x KN BOK RV 90°', '10X25 PL 1X DN H PV + H 1X KN BOK RV 90°')
  ) v(old, txt, fp) LOOP
    UPDATE public.training_sets SET text = r.txt, fingerprint = r.fp WHERE trainer_id = o AND phase = 'vaje' AND text = r.old;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Serija %: %', r.old, n; END IF;
    UPDATE public.training_items i SET text = r.txt, fingerprint = r.fp FROM public.trainings t WHERE t.id = i.training_id AND t.trainer_id = o AND i.text = r.old;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Postavka %: %', r.old, n; END IF;
  END LOOP;
END $$;
