-- Šifrant po pregledu celega zvezka, potrjeno 23. 11. 2026: preimenovanje 3 napačno prebranih kratic in 16 novih.
DO $$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  n int;
BEGIN
  UPDATE public.training_codes c SET code = v.new_code
    FROM (VALUES ('ZADUŠNICA', 'ZADNJIH 7 DN'), ('ROTULJICA', 'METULJČEK'), ('ROKA UZ ZAVES', 'ROKA VEN ZAVES')) AS v(old_code, new_code)
   WHERE c.code = v.old_code;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 3 THEN RAISE EXCEPTION 'Preimenovanje: % vrstic', n; END IF;

  INSERT INTO public.training_codes (code, meaning, category, created_by)
  SELECT v.code, v.meaning, v.category, o
    FROM (VALUES
      ('BIONDI', 'delfin vaja, skoraj enaka kot ORKA; nikoli skupaj z ORKA', 'vaja'),
      ('OBRATNO', 'mešano v obratnem vrstnem redu (NORMALNO / OBRATNO); pri KZ dihanje kontra', 'drugo'),
      ('5+1', '5 tempo, 1 hitro', 'stopnjevanje'),
      ('RV', 'roka ven, 90° (npr. KN RV)', 'vaja'),
      ('PPDZ', 'RRU: ponavljaj prednji del zavesljaja', 'vaja'),
      ('PZDZ', 'ponovi zadnji del zavesljaja', 'vaja'),
      ('PRSTI', 'RRU: prsti po gladini vode', 'vaja'),
      ('ŠTETJE', 'štetje zavesljajev', 'vaja'),
      ('6-3-6', '6 udarcev na boku, 3 zavesljaji, 6 udarcev na drugem boku', 'vaja'),
      ('3-1', 'H 3-1: trije udarci, 1 koordinacija', 'vaja'),
      ('KR', 'kravl roke (DN KR = delfin noge, kravl roke)', 'vaja'),
      ('DR', 'delfin roke (KN DR = kravl noge, delfin roke)', 'vaja'),
      ('PR', 'prsno roke (PR DN = prsno roke, delfin noge)', 'vaja'),
      ('BIEGNER', 'stegnjene roke', 'vaja'),
      ('BREZ VDIHA', 'poskusiš odplavati 50 m brez vdiha', 'drugo'),
      ('SALTO NA POL', 'salto na pol bazena in nazaj v cilj hitro, ne nadaljuješ naprej', 'vaja')
    ) AS v(code, meaning, category)
   WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE lower(x.code) = lower(v.code));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 16 THEN RAISE EXCEPTION 'Nove kratice: % vrstic', n; END IF;
END $$;
