-- Uvoz 17 pregledanih treningov lanske sezone (2025-11-12 do 2025-12-31). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2025/26 (2025-11-12–2025-12-31)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$[{"d":"2025-11-12","l":"C","o":0,"m":1500,"e":30,"i":[["R","200 RAZP",200],["O","4x50 25 H RRU OT + 25 PD",200],["V","8x25 PL KN SUPERMAN",200],["V","4x50 PL KV ↑LEVA ↓DESNA",200],["V","4x50 PL KV RRU",200],["M","50 RAZP",50],["V","10x25 ↑PPV ↓P 1-3",250],["G","150 ↑P ↓H",150],["K","50 RAZP",50]]},{"d":"2025-11-12","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 PL 1x K RRU 1x H RRU Z",400],["V","10x25 PL 1x K ČIM POČASNEJE 1x KN DR",250],["V","8x25 PL ↑DV 2-2-1 ↓D CT",200],["M","50 RAZP",50],["G","3x( 150 VL / 75 MBD / 50 HITRO / 25 RAZP )",900],["K","100 RAZP",100]]},{"d":"2025-11-19","l":"C","o":0,"m":1550,"e":31,"i":[["R","200 RAZP",200],["O","4x50 25 P 3 ZAVESLJAJI POD VODO + 25 P 1-1",200],["V","8x25 ↑P 2-1 ↓PD 3-5s",200],["V","6x25 P PODVODNI ZAVESLJAJ",150],["M","50 RAZP",50],["V","8x25 PL KN Z DESKO",200],["V","8x25 HZ ↑LEVA ↓DESNA",200],["G","3x100 PO ŽELJI",300],["K","50 RAZP",50]]},{"d":"2025-11-19","l":"A","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","8x50 ↑P/H ↓K",400],["V","8x25 PL H 90°",200],["V","6x50 ↑1x DV 2-2 1x D CT ↓K RRU GLADINA",300],["M","50 RAZP",50],["G","4x100 VL\n4x75 M VB1T\n4x50 K T\n4x25 1x KBD 1x MAX",1000],["K","50 RAZP",50]]},{"d":"2025-11-20","l":"AB","o":1,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","8x50 MM",400],["G","200 VL\n2x100 M\n4x50 K!",600],["V","8x25 ↑PPV ↓VRTAVKA",200],["M","50 RAZP",50],["V","8x50 PL 25 K RRU STEGR + 25 K RRU RINEŠ",400],["V","10x25 PL ↑DN PV ↓15m MAX D + RAZP",250],["K","100 RAZP",100]]},{"d":"2025-11-24","l":"AB","o":1,"m":2350,"e":33,"i":[["R","300 RAZP",300],["O","100 K + 75 P + 50 H + 25 D + 25 D + 50 H + 75 P + 100 K",500],["G","4x50 @1'\n2x100 @2'\n2x100 @2'\n4x50 @1'",800],["M","50 RAZP",50],["V","6x50 PL 1x KZ DIH KONTRA 1x NOGE!",300],["V","12x25 PL K SALTO NA POL",300],["K","100 RAZP",100]]},{"d":"2025-11-27","l":"AB","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","8x50 M 25 V + 25 CT 2xD 2xH 2xP 2xK",400],["V","6x50 PL 25 KN + 25 KV PALEC",300],["V","10x25 PL 1x DV 1-1-3 1x KV 15m PV POČASI",250],["M","50 RAZP",50],["G","4x( 3x50 1-3 @1'15\" / 50 RAZP ) 1x NORMALNO 1x VL 1x L 1x PL L",800],["K","100 RAZP",100]]},{"d":"2025-11-26","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","4x50 ↑PN NA H ↓P 1-2",200],["V","4x50 PL HN ↑OT ↓RZ",200],["V","4x50 PL HV ↑OT ↓RZ 1x LEVA 1x DESNA",200],["V","6x25 PL HV 3-1",150],["M","50 RAZP",50],["V","6x25 PD S PODVODNIM",150],["V","6x25 KN OBRAT",150],["K","100 RAZP",100]]},{"d":"2025-11-26","l":"A","o":1,"m":2250,"e":32,"i":[["R","300 RAZP",300],["O","4x100 M 25 N + 50 V + 25 CT",400],["G","25 D + 25 DV\n100 H\n200 75 EASY + 25!\n300 VL\n200 50 EASY + 50!\n100 H\n50 D!",1000],["M","50 RAZP",50],["Z","2x100 50 MAX + 50 RAZP",200],["V","10x25 PL 1x DN H PV + H 1x KN BOK RZ",250],["K","50 RAZP",50]]},{"d":"2025-12-03","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","4x50 ↑H CT ↓P 1-2",200],["V","4x50 P PODVODNI + OBRAT + PODVODNI",200],["V","6x25 P ↑1-1-1 ↓1-1",150],["M","50 RAZP",50],["V","6x25 KN PREVAL NA SREDINI",150],["V","6x25 PL K RRU PREVAL NA STENO",150],["V","4x50 K RRU PALEC",200],["K","100 RAZP",100]]},{"d":"2025-12-03","l":"A","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","8x50 ↑H RRU Z ↓K RRU PPDZ",400],["G","4x100 M 1x NORMALNO 1x NOGE 1x VAJE 1x OBRATNO\n4x100 KVL\n4x100 PL 50 N! + 50 RAZP\n4x100 1x 100 T 1x 75 T + 25! 1x 50 T + 50! 1x 25 T + 75! @2'15\"",1600],["K","100 RAZP",100]]},{"d":"2025-12-10","l":"C","o":0,"m":900,"e":18,"i":[["R","200 RAZP",200],["O","6x25 SKOK PODVODNI + P",150],["V","4x50 P PODVODNI + OBRAT",200],["M","50 RAZP",50],["V","6x25 PL KN OBRAT NA POL OBRAT NA KONCU",150],["V","6x25 PL K RRU 3s OBRAT NA KONCU + ODRIV NA HRBTU",150]]},{"d":"2025-12-10","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","3x100 PL MBP 50 N + 25 V + 25 CT",300],["V","6x50 PL 15m PV OBRAT 15m PV 1x H 1x K",300],["M","50 RAZP",50],["G","4x25 S SKOKOM p10\"\n4x50 S SKOKOM T\n4x75 S SKOKOM 50! + 25 RAZP",600],["M","50 RAZP",50],["V","4x50 2x PREVAL + SALTO OBRAT + 2x PREVAL NAZAJ",200],["Z","300 VL SALTO OBRAT",300],["K","100 RAZP",100]]},{"d":"2025-12-15","l":"AB","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","4x( 75 MBK p20\" / 50 K DIH 3/4 p20\" / 25 KN MAX )",600],["G","8x75 K ROKE VL",600],["M","50 RAZP",50],["G","6x100 1x T 1x 75 T + 25! 1x 50 T + 50!",600],["K","50 RAZP",50]]},{"d":"2025-12-17","l":"A","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","2x200 PL 50 SCULLING + 50 K + 50 HN + 50 H",400],["V","3x100 PL 25 PV + 75 K 1x D 1x DN H 1x KN",300],["V","4x50 PL 25 D + 25 H",200],["M","50 RAZP",50],["G","20x50 K 4+1 10x @1' 10x VL @50\"",1000],["K","50 RAZP",50]]},{"d":"2025-12-17","l":"C","o":0,"m":1400,"e":28,"i":[["R","200 RAZP",200],["O","4x50 P 1-2 1-3 OBRAT + PODVODNI",200],["V","8x25 PL KN 1x NORMALNO 1x ČIM MANJ VDIHOV",200],["V","4x50 PL KZ 3s",200],["V","8x25 CT 4x PL 4x NORMALNO",200],["M","50 RAZP",50],["G","3x100 25 K + 50 P + 25 H",300],["K","50 RAZP",50]]},{"d":"2025-12-18","l":"AB","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","50 DV + 75 P 1-3 + 100 H RRU Z + 150 K 25 SHARK/CT + 100 H + 75 P + 50 D",600],["V","6x50 PL 25 DN KOMB + 25 DN PR/DN KR",300],["V","6x25 PL PV",150],["M","50 RAZP",50],["G","12x50 2x K T 1x M!\n50 RAZP\n12x25 1x MAX S SKOKOM 3x EASY",950],["K","50 RAZP",50]]}]$j$::jsonb) x;

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
  IF k <> 76 THEN RAISE EXCEPTION 'Serije: %', k; END IF;

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
  IF n <> 17 OR k <> 126 OR s <> 33250 OR l <> 76 THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
