-- Uvoz 20 pregledanih treningov lanske sezone (2025-09-01 do 2025-11-11). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2025/26 (2025-09-01–2025-11-11)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$[{"d":"2025-09-18","l":"AB","o":0,"m":2050,"e":29,"i":[["R","300 RAZP",300],["O","16x25 M",400,null,"12x25 M"],["V","10x50 PL 1x DN 1x DN KR 3x 25 D + 25 H",500,null,"6x50 PL 1x DN 1x DN KR 1x 25 D + 25 H"],["M","50 RAZP",50],["G","4x100 @1'50\"\n4x50 @1'20\"\n4x25 @1'",700,null,"3x100\n3x50\n3x25"],["K","100 RAZP",100]]},{"d":"2025-10-01","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","4x50 25 PD + 25 GERMANJA HN",200],["V","8x25 PN 1x 3-1 1x 2-1",200],["V","4x50 1x PD 1x PV 1-2",200],["M","50 RAZP",50],["V","6x25 PL KN BD",150],["V","6x25 PL KN SUPERMAN",150],["V","8x25 PL KV ↑LEVA ↓DESNA",200],["K","50 RAZP",50]]},{"d":"2025-10-01","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","6x75 25 MBK + 50 K",450],["V","10x25 PL ↑DN PV ↓SCULLING",250],["M","50 RAZP",50],["G","3x( 150 VL / 100 K T / 50 K! / 25 D / 25 RAZP )",1050],["K","100 RAZP",100]]},{"d":"2025-10-02","l":"AB","o":1,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","6x50 1x H 1x 25 H + 25 K 1x K",300],["G","2x( 4x100 @2' ) 3x K 1-3 1x RAZP",800],["V","8x50 PL K 15m PV HITER PREHOD",400],["Z","4x50 PL 25! + 25 RAZP",200],["Z","2x50 25! + 25",100],["K","100 RAZP",100]]},{"d":"2025-10-08","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","4x50 ↑PD 3s ↓PD 5s",200],["V","8x25 PL 1x HN OT ROTACIJA 1x HN RZ",200],["V","6x25 PL HZ ↑DESNA ↓LEVA + ROTACIJA",150],["M","50 RAZP",50],["V","8x25 PL 1x H RRU Z 1x H RRU OT",200],["G","2x200 BREZ USTAVLJANJA",400],["K","50 RAZP",50]]},{"d":"2025-10-08","l":"A","o":1,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 MM",400],["G","2x100 K T @2'\n2x75 PR DN\n2x50 H\n2x25 D\n2x50 H\n2x75 PR DN\n2x100 K T @2'",950],["M","50 RAZP",50],["V","8x50 K PL 3x EASY 1x HITRO",400],["K","100 RAZP",100]]},{"d":"2025-10-09","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","3x150 K PL 50 N + 50 V + 50 CT",450],["V","8x25 PL 1x DN KR 1x K",200],["M","50 RAZP",50],["G","400 VL\n300 K VSAK 4. 25 HITRO\n200 K HITRI OBRAT\n100 M\n2x50 T 32-35 @1'\n2x50 25! + 25",1200],["K","100 RAZP",100]]},{"d":"2025-10-15","l":"C","o":0,"m":1300,"e":26,"i":[["R","200 RAZP",200],["O","8x25 P 1-2 1-3",200],["V","6x25 PN NA H",150],["V","6x25 GERMANJA 1x PN 1x KN",150],["M","50 RAZP",50],["V","4x50 PL KN 2x Z DESKO 2x BREZ",200],["V","6x25 KZ Z DESKO ↑LEVA ↓DESNA",150],["V","6x25 K RRU BD",150],["K","50 RAZP",50]]},{"d":"2025-10-15","l":"AB","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 K 1x L/D 1x ČMZ DIH 3",400],["V","12x25 PL 1x DV 2-2-1 1x SHARK 2",300],["V","3x100 PL N 1x 50 D + 50 H 1x 50 H + 50 K",300],["M","50 RAZP",50],["G","8x100 1x EASY 1x VSAK OBRAT 3 UDARCI 1x 50 HITRO + 50 POČASI 1x HITRO",800,null,"6x100 1x EASY 1x VSAK OBRAT 3 UDARCI 1x 50 HITRO + 50 RAZP"],["K","50 RAZP",50]]},{"d":"2025-10-20","l":"AB","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","6x75 MBK 1xN 1xV 1xCT",450],["V","6x50 PL DN 1x BOK 1x HRBET 1x TREBUH VSAKIČ 10-15 PV",300],["V","6x50 PL 25 K 6-3-6 + 25 PR KN",300],["M","50 RAZP",50],["G","3x100 2x EASY 1x MAX @2'\n50 RAZP\n3x50 2x EASY 1x MAX @1'15\"\n50 RAZP\n3x25 2x EASY 1x MAX @1'\n75 RAZP",700],["K","100 RAZP",100]]},{"d":"2025-10-22","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","3x100 PL KN 1x SUPERMAN 1x GLAVA V VODI 1x GLAVA ZUNAJ",300],["V","8x25 PL KZ ↑LEVA ↓DESNA",200],["V","8x25 PL K 6-3-6",200],["V","3x50 PL K RRU",150],["M","50 RAZP",50],["G","4x50 25 P HITRO + 25 RAZP",200],["K","100 RAZP",100]]},{"d":"2025-10-22","l":"A","o":0,"m":2100,"e":30,"i":[["R","300 RAZP",300],["O","8x50 PL 1x 25 VATERPOLO + 25 K 1x 25 HN + 25 K",400],["V","10x25 PL K ZADNJIH 5m MAX",250],["M","50 RAZP",50],["G","4x150 75 H + 50 K + 25 D/P\n4x100 50 K T + 25 K HITRO + 25 D",1000],["K","100 RAZP",100]]},{"d":"2025-10-23","l":"AB","o":1,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","100 K + 75 P + 50 H + 25 D + 25 D + 50 H + 75 P + 100 K",500],["M","50 RAZP",50],["G","2x( 3x100 T 1:20 ) 1x @2' 1x @1'50\"\n50 RAZP\n2x( 3x50 ) 1x @1' T 35-38 1x @50\" T 30-35",950],["M","50 RAZP",50],["V","16x25 PL 1x DN PV 1x D 1x KBD 1x K!",400],["K","50 RAZP",50]]},{"d":"2025-10-29","l":"C","o":0,"m":1500,"e":30,"i":[["R","200 RAZP",200],["O","4x50 PL HN",200],["V","4x50 PL HZ",200],["V","4x50 PL HV 3-1",200],["V","4x50 H CT",200],["M","100 RAZP",100],["G","3x100 1x P CT 1x P 1-2 1x PD 5s",300],["K","100 RAZP",100]]},{"d":"2025-10-29","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 PL 25 HN + 25 H RRU 90°",400],["V","8x50 PL 1x K ČMZ 1x H",400],["M","100 RAZP",100],["G","6x50 2x K 1x D\n3x100 @2'\n300 V",900,null,"300 PL"],["K","100 RAZP",100]]},{"d":"2025-10-30","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","4x100 M OBRATNO",400],["V","8x50 PL 1x K L/D 1x RRU PESTI 1x RRU 3s 1x KR DN",400],["M","100 RAZP",100],["G","4x50 @1'10\"\n4x100 VL\n4x50 N 3+1\n4x50 25! S SKOKOM + 25 RAZP",1000],["K","100 RAZP",100]]},{"d":"2025-11-03","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","6x75 M VB1T",450,null,"6x75 M VB1T (D VAJE)"],["V","10x25 ↑DN BOK ↓D 5xN 3x CELA",250],["M","50 RAZP",50],["G","6x100 K 1-3/2 @2'",600],["M","50 RAZP",50],["V","4x75 PL 50 ČMZ + 25 KN",300],["V","8x25 PL 1x KBD 1x H",200],["K","100 RAZP",100]]},{"d":"2025-11-05","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","8x25 1x KN 1x GERMANJA",200],["V","4x50 P 1-2/2-1",200],["V","4x50 P 1-1/1-1-1",200],["G","2x100 1x PD 1x P CT",200],["M","50 RAZP",50],["V","4x75 PL 50 SUPERMAN + 25 K RRU",300],["K","50 RAZP",50]]},{"d":"2025-11-05","l":"A","o":1,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","12x50 MM ↑N ↓CT",600],["G","2x200 VL\n2x100 M\n2x50 K HITRO",700],["M","50 RAZP",50],["V","10x25 PL 1x H RRU 90° 1x H 15m PV CT",250],["V","10x25 PL 1x K SHARK 1 1x VATERPOLO",250],["K","50 RAZP",50]]},{"d":"2025-11-11","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 PL ↑N ↓CT H/K",400],["V","10x25 PL 1x DV 2-2-3 1x K 6-3-6",250],["M","50 RAZP",50],["G","16x50 K 4x ČIM MANJ VDIHOV 4x TEMPO 4x ČMZ 4x HITRO @1'",800],["Z","8x50 25 SCULLING + 25 RAZP",400]]}]$j$::jsonb) x;

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
  IF k <> 82 THEN RAISE EXCEPTION 'Serije: %', k; END IF;

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
  IF n <> 20 OR k <> 142 OR s <> 39400 OR l <> 82 THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
