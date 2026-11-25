-- Uvoz 15 pregledanih treningov lanske sezone (2026-01-01 do 2026-01-31). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2025/26 (2026-01-01–2026-01-31)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$[{"d":"2026-01-07","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","4x50 25 PD + 25 H",200],["V","8x25 KN Z DESKO 1x GV 1x GN",200],["V","6x25 KV RRU",150],["M","50 RAZP",50],["V","8x25 PL DN 1x OT 1x RS",200],["V","8x25 PL DZ ↑DESNA ↓LEVA",200],["G","200 POLJUBNO",200]]},{"d":"2026-01-07","l":"A","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","8x50 M 25 N + 25 CT",400],["V","4x100 PL K 1x 1. 25 D 1x 2. 25 D 1x 3. 25 D 1x 4. 25 D",400],["V","6x50 PL N 25 HITRO + 25 RAZP",300],["M","50 RAZP",50],["G","3x100 VL\n3x75 M\n25 M RAZP\n3x50 TEMPO\n3x25 D\n25 RAZP",800],["K","50 RAZP",50]]},{"d":"2026-01-08","l":"AB","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","8x50 MM",400],["V","2x( 8x25 PL ) 1x ↑DN PR ↓SHARK 1x ↑VRTAVKA ↓RRU PESTI",400],["G","2x( 4x50 KVL ) 1x @1' 1x @50\"\n2x( 2x100 M ) 1x NORMALNO 1x OBRATNO\n2x200 K @3'30\"",1200],["K","100 RAZP",100]]},{"d":"2026-01-12","l":"AB","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","3x150 MBK PO 50 25 V + 25 CT",450],["G","3x50 STOP 1-3 @1'",150],["M","50 RAZP",50],["G","3x100 M p20\"\n3x25 STOP 1-3 @40\"\n25 RAZP\n10x75 KVL T",1150],["K","100 RAZP",100]]},{"d":"2026-01-14","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","4x50 25 H RRU OT + 25 PD",200],["V","8x25 PL KN Z DESKO VDIH 3-5s",200],["V","6x25 PL KV RRU 3s",150],["M","50 RAZP",50],["V","4x50 ↑PD 5s ↓P 1-1",200],["V","8x25 PN Z DESKO 1x 1-3 1x 1-1",200],["G","2x100 P OBRATI PODVODNI",200],["K","50 RAZP",50]]},{"d":"2026-01-14","l":"A","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","2x( 100 K / 75 P / 50 H / 25 D ) 1. 25 N + 25 CT 2. 25 V + 25 CT",500],["V","8x25 PL 1x DN PV 1x DN PR",200],["V","4x50 PL KV 1x RRU PESTI 1x RRU PZDZ",200],["M","50 RAZP",50],["G","5x( 100 KVL / 50 K T / 25 STIL HITRO / 25 RAZP )",1000],["K","50 RAZP",50]]},{"d":"2026-01-15","l":"AB","o":1,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","6x75 MBK PO 75 25 N + 25 V + 25 CT",450],["G","4x( 4x50 ) 1x @1'15\" 1x @1'10\" 1x @1' 1x @50\" T 35",800,"4X(4X50) 1X @1'15\" 1X @1'10\" 1X @1' 1X @50\" T"],["M","50 RAZP",50],["V","4x50 PL N 25 MAX + 25 RAZP",200],["V","6x75 PL 25 KBD + 25 VATERPOLO + 25 ČMZ",450],["K","50 RAZP",50]]},{"d":"2026-01-19","l":"AB","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","6x75 50 MBD + 25 D",450],["V","4x50 PL H RRU ↑Z ↓90°",200],["V","10x50 PL 4-3-2-1 @1' T 40-36-32-28",500,"10X50 PL 4-3-2-1 @1' T"],["M","50 RAZP",50],["G","6x100 KVL @2' T 1:15\n200 KN",800,"6X100 KVL @2' T\n200 KN"],["K","100 RAZP",100]]},{"d":"2026-01-22","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","4x100 1x 75 K + 25 H 1x 75 K + 25 D",400],["V","6x50 PL K VSAKIČ 10m PV",300],["V","4x50 PL ↑15m PV + D 2-2-2 ↓15m PV + K ČIM POČASNEJE",200],["M","50 RAZP",50],["G","2x( 3x100 / 50 ) 1x @2' 1x @1'45\" T 1:10-1:14\n10x25 ROKE VL",950,"2X(3X100 / 50) 1X @2' 1X @1'45\" T\n10X25 ROKE VL"],["K","100 RAZP",100]]},{"d":"2026-01-21","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","4x50 25 PPV + 25 PD",200],["V","6x25 PL HN ROTACIJA",150],["V","4x25 PL HN LONČEK",100],["V","6x25 PL HV RRU OT + LONČEK",150],["V","6x25 H CT LONČEK",150],["M","50 RAZP",50],["G","4x75 50 P + 25 K\n2x50 25 P! + 25 RAZP",400],["K","50 RAZP",50]]},{"d":"2026-01-21","l":"A","o":0,"m":2250,"e":32,"i":[["R","300 RAZP",300],["O","6x75 25 MBK + 50 K",450],["V","4x50 PL 25 N MAX + 25 H",200],["M","50 RAZP",50],["G","3x( 6x50 @1' ) 2x EASY 1x HITRO 1x PL 1x VL 1x NORMALNO",900],["M","100 RAZP",100],["V","4x50 25 PPV + 25 H",200],["K","50 RAZP",50]]},{"d":"2026-01-26","l":"AB","o":0,"m":2150,"e":30,"i":[["R","300 RAZP",300],["O","4x100 M PO 25 Z ZAMIKOM",400],["V","4x50 PL 1x SUPERMAN 1x KZ DIH KONTRA",200],["V","8x25 PL 1x PV HN 1x VATERPOLO",200],["M","50 RAZP",50],["G","4x( 100 @2' / 50 p45\" )",600],["M","50 RAZP",50],["G","4x75 50 N + 25 MAX",300],["K","50 RAZP",50]]},{"d":"2026-01-29","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","4x100 PL 25 N + 75 CT 1x H 1x K",400],["V","10x25 PL ↑D CT ↓SCULLING",250],["V","4x50 K RRU 1x PPDZ 1x PESTI",200],["M","50 RAZP",50],["G","2x( 6x50 @1' ) 1x MAD 1x NORMALNO",600],["M","50 RAZP",50],["G","8x50 25! + 25 RAZP 1x N 1x K 1x N 1x STIL",400],["K","50 RAZP",50]]},{"d":"2026-01-28","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","4x75 P 1-2/1-3/PD",300],["V","8x25 PL KN 1x PR 1x GV",200],["V","6x25 PL K RRU 2s",150],["V","6x25 PL K RRU PALEC",150],["V","3x50 PL K CT",150],["M","50 RAZP",50],["G","200 P",200],["K","50 RAZP",50]]},{"d":"2026-01-28","l":"A","o":0,"m":2250,"e":32,"i":[["R","300 RAZP",300],["O","4x50 PL ↑D 5-2 ↓PR KN",200],["V","4x75 PL K VSAKIH 25 1 CIKEL MANJ",300],["M","50 RAZP",50],["G","3x100 KVL @2'\n3x50 K 1-3\n2x100 PL @2'\n2x50 NOGE PL @1'\n100 M\n50 MAX",900],["M","50 RAZP",50],["V","8x50 1x KZ ↑LEVA ↓DESNA DIH KONTRA 1x DIH 3/5",400],["K","50 RAZP",50]]}]$j$::jsonb) x;

  IF EXISTS (SELECT 1 FROM _t JOIN public.trainings t ON t.trainer_id = o AND t.date = _t.d AND t.levels = _t.lv) THEN
    RAISE EXCEPTION 'Kateri od treningov je že v bazi';
  END IF;

  CREATE TEMP TABLE _i ON COMMIT DROP AS
  SELECT _t.d, _t.lv, (i.ord - 1)::int AS pos,
         CASE i.v->>0 WHEN 'R' THEN 'razplavanje' WHEN 'O' THEN 'ogrevalna' WHEN 'V' THEN 'vaje' WHEN 'M' THEN 'vmesno_razplavanje'
                      WHEN 'G' THEN 'glavna' WHEN 'Z' THEN 'zakljucek' WHEN 'K' THEN 'zakljucno_razplavanje' END AS phase,
         i.v->>1 AS txt, (i.v->>2)::int AS m,
         coalesce(i.v->>3, replace(replace(upper(i.v->>1), '( ', '('), ' )', ')')) AS fp, i.v->>4 AS b
  FROM _t CROSS JOIN LATERAL jsonb_array_elements(_t.items) WITH ORDINALITY AS i(v, ord);

  INSERT INTO public.training_sets AS ts (trainer_id, phase, levels, text, structure, meters, fingerprint, source, notes)
  SELECT o, phase, (SELECT array_agg(DISTINCT u ORDER BY u) FROM _i j, unnest(j.lv) u WHERE j.phase = i.phase AND j.fp = i.fp),
         min(txt), jsonb_build_object('v', 1, 'meters', min(m)), min(m), fp, 'uvoz', 'zvezek 2025/26'
  FROM _i i WHERE phase IN ('ogrevalna', 'vaje', 'glavna', 'zakljucek') GROUP BY phase, fp
  ON CONFLICT (trainer_id, phase, fingerprint) DO UPDATE
    SET levels = (SELECT array_agg(DISTINCT u ORDER BY u) FROM unnest(ts.levels || excluded.levels) u);
  GET DIAGNOSTICS k = ROW_COUNT;
  IF k <> 68 THEN RAISE EXCEPTION 'Serije: %', k; END IF;

  INSERT INTO public.trainings (trainer_id, term_id, date, levels, status, order_variant, total_meters, estimated_minutes, notes)
  SELECT o, (SELECT te.id FROM public.terms te JOIN public.trainer_terms tt ON tt.term_id = te.id
              WHERE tt.trainer_id = o AND te.day = extract(isodow FROM _t.d)::int
                AND _t.d BETWEEN coalesce(te.date_from, _t.d) AND coalesce(te.date_to, _t.d) LIMIT 1),
         _t.d, _t.lv, 'izveden', _t.ord, _t.m, _t.e, note
  FROM _t;

  INSERT INTO public.training_items (training_id, position, phase, set_id, text, structure, meters, fingerprint, level_variants)
  SELECT t.id, i.pos, i.phase,
         (SELECT x.id FROM public.training_sets x WHERE x.trainer_id = o AND x.phase = i.phase AND x.fingerprint = i.fp),
         i.txt, jsonb_build_object('v', 1, 'meters', i.m), i.m, i.fp,
         CASE WHEN i.b IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('B', jsonb_build_object('text', i.b)) END
  FROM _i i JOIN public.trainings t ON t.trainer_id = o AND t.date = i.d AND t.levels = i.lv AND t.notes = note;

  SELECT count(DISTINCT t.id), count(i.id), sum(i.meters), count(i.set_id) INTO n, k, s, l
  FROM public.trainings t JOIN public.training_items i ON i.training_id = t.id WHERE t.trainer_id = o AND t.notes = note;
  IF n <> 15 OR k <> 115 OR s <> 30900 OR l <> 68 THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
