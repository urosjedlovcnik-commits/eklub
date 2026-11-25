-- Šifrant, potrjeno 25. 11. 2026: BIEGNER -> STEGR, PRSTI -> GLADINA, nove kratice, KN RV -> KN RV 90° v starih zapisih. Vse ali nič.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  r record;
  n int;
BEGIN
  UPDATE public.training_codes SET code = 'STEGR', meaning = 'stegnjene roke' WHERE code = 'BIEGNER';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'BIEGNER: %', n; END IF;
  UPDATE public.training_codes SET code = 'GLADINA', meaning = 'RRU GLADINA (kravl): prsti drsijo po gladini vode' WHERE code = 'PRSTI';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 1 THEN RAISE EXCEPTION 'PRSTI: %', n; END IF;

  INSERT INTO public.training_codes (code, meaning, category, stroke, created_by)
  SELECT v.code, v.meaning, v.category, v.stroke, o FROM (VALUES
    ('HZ', 'hrbtno zavesljaji (npr. tja desna, nazaj leva)', 'vaja', 'H'),
    ('RZ', 'roke zgoraj na gladini; RRU Z = roka čaka zgoraj na gladini', 'vaja', NULL),
    ('OT', 'roke spodaj ob telesu; RRU OT = roka čaka ob telesu', 'vaja', NULL),
    ('GV', 'pri KN: glava ven (zunaj)', 'vaja', NULL),
    ('GN', 'pri KN: glava v vodi', 'vaja', NULL),
    ('VRTAVKA', 'vrtavka', 'vaja', NULL),
    ('LONČEK', 'lonček na glavi pri hrbtno: noge, vaje ali cela tehnika', 'vaja', 'H'),
    ('1 CIKEL MANJ', 'vsakih 25 m en cikel (zavesljaj) manj, bolj učinkovito', 'vaja', NULL),
    ('LOKOMOTIVA', 'izmenjajoče plavanje: prvi odplava 25 m, počaka in gre na zadnje mesto', 'drugo', NULL),
    ('1-1', 'prsno: ločeno roke, ločeno noge; lahko enkrat z vdihom, enkrat brez', 'vaja', 'P'),
    ('2-1', 'prsno: dvakrat roke, enkrat noge (obratno od 1-2)', 'vaja', 'P')
  ) AS v(code, meaning, category, stroke)
  WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = lower(v.code));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 11 THEN RAISE EXCEPTION 'Nove kratice: %', n; END IF;

  FOR r IN SELECT * FROM (VALUES
    ('8X25 PL KN RV', '8x25 PL KN RV 90°', '8X25 PL KN RV 90°', 2),
    ('8X25 PL ↑KN RV ↓H 3-1', '8x25 PL ↑KN RV 90° ↓H 3-1', '8X25 PL ↑KN RV 90° ↓H 3-1', 1),
    ('8X25 PL K ↑BIEGNER ↓BD', '8x25 PL K ↑STEGR ↓BD', '8X25 PL K ↑STEGR ↓BD', 1),
    ('2X(8X25) 1X DN + SHARK 1 1X RRU PRSTI', '2x( 8x25 ) 1x DN + SHARK 1 1x RRU GLADINA', '2X(8X25) 1X DN + SHARK 1 1X RRU GLADINA', 1)
  ) AS v(old_fp, txt, fp, cnt)
  LOOP
    UPDATE public.training_sets SET text = r.txt, fingerprint = r.fp WHERE trainer_id = o AND phase = 'vaje' AND fingerprint = r.old_fp;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN RAISE EXCEPTION 'Serija %: %', r.old_fp, n; END IF;
    UPDATE public.training_items i SET text = r.txt, fingerprint = r.fp FROM public.trainings t
     WHERE t.id = i.training_id AND t.trainer_id = o AND i.phase = 'vaje' AND i.fingerprint = r.old_fp;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> r.cnt THEN RAISE EXCEPTION 'Postavke %: %', r.old_fp, n; END IF;
  END LOOP;
END $$;
