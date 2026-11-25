-- Uvoz 21 pregledanih treningov lanske sezone (2026-05-01 do 2026-06-30). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2025/26 (2026-05-01–2026-06-30)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$[{"d":"2026-05-04","l":"AB","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","4x100 M CT/N/V/CT",400],["V","4x50 PL K MAX OBRAT",200],["V","12x25 PL 1x DN 1x H 1x D 1x HN",300],["M","50 RAZP",50],["G","2x( 8x50 ) 1. VL 2. 1x T 1x HITRO",800],["M","50 RAZP",50],["Z","8x25 1x KBD 1x H",200],["K","100 RAZP",100]]},{"d":"2026-05-07","l":"AB","o":1,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","8x50 M 4xV 4xCT",400],["G","2x200 VL\n4x100 3x T 1x HITRO\n8x50 @50\"",1200],["M","50 RAZP",50],["V","6x50 PL N @1'10\"",300],["K","50 RAZP",50]]},{"d":"2026-05-06","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","4x50 ↑P ↓GERMANJA KN",200],["V","8x25 PL HN ROTACIJA",200],["V","4x50 PL H ZAVES",200],["V","4x50 H 3-1",200],["M","50 RAZP",50],["V","6x25 H CT",150],["G","4x50 P @1'30\"",200],["K","50 RAZP",50]]},{"d":"2026-05-06","l":"A","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","200 K + 150 H + 100 P + 50 D",500],["V","4x50 PL K 1x 3-1 1x 6-3-6",200],["V","10x25 PL 1x DN PR 1x D",250],["M","50 RAZP",50],["G","6x100 K 3-2-1",600],["M","50 RAZP",50],["Z","300 VL",300],["K","50 RAZP",50]]},{"d":"2026-05-11","l":"AB","o":0,"m":2450,"e":35,"i":[["R","300 RAZP",300],["O","4x75 N/V/CT",300],["V","8x25 PL 1x HITRO 1x POČASI 10m PV",200],["V","4x50 PL 1x PZDZ 1x PPDZ",200],["M","50 RAZP",50],["G","10x100 2x @2' 2x @1'55\" 2x @1'50\" 2x @1'45\" 2x @1'40\"",1000],["M","50 RAZP",50],["V","12x25 1x POD VODO 1x RAZP",300],["K","50 RAZP",50]]},{"d":"2026-05-14","l":"AB","o":0,"m":2650,"e":38,"i":[["R","300 RAZP",300],["O","100 M + 200 M + 100 M",400],["G","12x50 VL @55\"",600],["M","50 RAZP",50],["G","12x50 PL 6x CT @55\" 6x N @1'",600],["M","50 RAZP",50],["G","12x50 CT @55\"",600],["K","50 RAZP",50]]},{"d":"2026-05-13","l":"C","o":0,"m":1450,"e":29,"i":[["R","200 RAZP",200],["O","2x75 1x 25 K + 50 P 1x 25 H + 50 P",150],["V","4x50 P @1'20\"",200],["M","50 RAZP",50],["V","4x50 P 25 HITRO + 25 RAZP",200],["V","8x25 PL N ↑K ↓H",200],["V","4x50 PL K RRU",200],["V","4x50 K 2x PL 2x BREZ",200],["K","50 RAZP",50]]},{"d":"2026-05-13","l":"A","o":0,"m":2600,"e":37,"i":[["R","300 RAZP",300],["O","8x50 MM OBRATNO",400],["V","12x25 PL 1x DN PV 1x H 1x KBD 1x HN",300],["V","4x50 HV 1x RRU 90° 1x RRU ROTACIJA ZAPESTJA",200],["M","50 RAZP",50],["G","4x100 VL\n4x50 K TEMPO\n4x25 D\n4x50 K 25 HITRO + 25\n4x100 VL",1300],["K","50 RAZP",50]]},{"d":"2026-05-18","l":"AB","o":0,"m":2150,"e":30,"i":[["R","300 RAZP",300],["O","4x100 PL K 1x 1. 25 D 1x 2. 25 D 1x 3. 25 D 1x 4. 25 D",400],["V","8x25 PL 1x VATERPOLO HITRO 1x RRU 5s",200],["M","50 RAZP",50],["G","4x100 3+1\n50 RAZP\n4x50 3+1\n50 RAZP\n4x25 3+1\n50 RAZP\n4x75 KVL",1150],["K","50 RAZP",50]]},{"d":"2026-05-21","l":"A","o":1,"m":1800,"e":26,"i":[["R","300 RAZP",300],["O","4x100 M OBRATNO N/CT",400],["G","400 LOKOMOTIVA",400],["M","50 RAZP",50],["G","4x( 25 MAX S SKOKOM / 25 RAZP )\n2x50 MAX S SKOKOM",300],["M","100 RAZP",100],["V","10x25 VSAKIČ DLJE POD VODO",250]]},{"d":"2026-05-21","l":"AB","o":1,"m":2150,"e":30,"i":[["R","300 RAZP",300],["O","4x100 M OBRATNO N/CT",400],["G","400 LOKOMOTIVA PO 50",400,null,"400 LOKOMOTIVA PO 25"],["M","50 RAZP",50],["G","4x( 25 PL / 25 RAZP ) 1x STOP 1x RG\n50 PL MAX + 50 RAZP\n75 PL MAX + 75 RAZP\n100 PL MAX + 100 RAZP",650],["V","12x25 VSAKIČ DLJE POD VODO",300],["K","50 RAZP",50]]},{"d":"2026-05-20","l":"C","o":0,"m":1500,"e":30,"i":[["R","200 RAZP",200],["O","4x75 1x P 1x K 1x H 1x P",300],["V","8x25 PL DN",200],["V","4x50 PL DZ",200],["V","4x25 METULJČEK",100],["M","50 RAZP",50],["V","4x50 P 1x 1-1-1 1x 1-3",200],["G","4x50 P 25! + 25 RAZP",200],["K","50 RAZP",50]]},{"d":"2026-05-20","l":"A","o":0,"m":2100,"e":30,"i":[["R","300 RAZP",300],["O","6x75 25 D + 50 MBD",450],["V","4x50 PL DN 1x BOK 1x OT",200],["V","8x25 PL ↑D ↓ORKA",200],["M","50 RAZP",50],["G","4x( 4x50 ) 1x T 1x STOP 1x MAX 1x H",800],["K","100 RAZP",100]]},{"d":"2026-05-25","l":"AB","o":0,"m":2350,"e":33,"i":[["R","300 RAZP",300],["O","8x50 MM ↑N ↓CT",400],["V","6x50 PL 25 N! + 25 H",300],["V","12x25 PL 1x KN RS 1x K RRU PESTI",300],["M","50 RAZP",50],["G","3x( 100 @2' / 2x50 @50\" / 100 @2' )",900],["K","100 RAZP",100]]},{"d":"2026-05-28","l":"AB","o":0,"m":2350,"e":33,"i":[["R","300 RAZP",300],["O","2x( 25 D / 50 H / 75 P / 100 K )",500],["V","8x25 PL DN PV",200],["V","4x50 PL MAX NOGE @1'",200],["M","50 RAZP",50],["G","6x25 @25\"\n6x50 @50\"\n6x100 @1'40\"",1050],["K","50 RAZP",50]]},{"d":"2026-05-27","l":"C","o":0,"m":1500,"e":30,"i":[["R","200 RAZP",200],["O","4x50 1x PD 1x P 1-3 OBRATI",200],["V","8x25 PN OT",200],["V","4x50 PV 1x 1-1 1x 1-1-1",200],["V","6x50 25! + 25 POČASI",300],["M","50 RAZP",50],["G","300 P/K PO 75/25",300],["K","50 RAZP",50]]},{"d":"2026-05-27","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","4x75 MM 25+50",300],["V","4x50 PL HN 90°",200],["V","12x25 PL H RRU 1x 2s 1x 5s 1x 9s",300],["M","50 RAZP",50],["G","200 VL\n100 M\n50 P\n25 D + 25 RAZP\n50 K!\n100 K!\n200 T",750],["M","50 RAZP",50],["Z","4x50 KN DESKA",200],["K","50 RAZP",50]]},{"d":"2026-06-01","l":"AB","o":0,"m":2400,"e":34,"i":[["R","300 RAZP",300],["O","8x50 1x 25 KN + 25 H 1x 25 HN + 25 K",400],["V","8x50 PL 1x DN KR 1x DN PR",400],["G","4x100 VL @1'50\"\n8x50 4x STOP 1-4 4x RG 4-1",800],["M","50 RAZP",50],["V","6x25 N MAX",150],["Z","8x25 ROKE L",200],["K","100 RAZP",100]]},{"d":"2026-06-04","l":"AB","o":0,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","3x100 MBD 50 N + 25 V + 25 CT",300],["V","8x25 PL ↑DV 1-1-2 ↓D CT 15m",200],["V","4x50 PL 1x K RRU SHARK 1x K RRU PALEC",200],["M","50 RAZP",50],["G","20x50 4x M 8x VL 4x TEMPO 4x 1-4",1000],["M","50 RAZP",50],["V","6x25 D!",150],["K","50 RAZP",50]]},{"d":"2026-06-03","l":"C","o":0,"m":1550,"e":31,"i":[["R","200 RAZP",200],["O","6x50 1x P 1x K 1x H",300],["V","8x25 PL KN ↑! ↓POČASI",200],["V","4x50 PL KV 2-2",200],["V","8x25 K CT",200],["M","50 RAZP",50],["V","4x50 ↑PPV ↓GERMANJA HN",200],["V","6x25 METULJČEK",150],["K","50 RAZP",50]]},{"d":"2026-06-03","l":"A","o":0,"m":2200,"e":31,"i":[["R","300 RAZP",300],["O","6x75 25 K + 50 MBK 3x V 3x CT",450],["V","8x25 ↑PPV ↓H",200],["G","4x( 100 @1'45\" / 50! / 50 RAZP )",800],["M","50 RAZP",50],["V","6x25 PL K 15m MAX",150],["V","6x25 PL K ZADNJIH 10 MAX",150],["K","100 RAZP",100]]}]$j$::jsonb) x;

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
  IF k <> 97 THEN RAISE EXCEPTION 'Serije: %', k; END IF;

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
  IF n <> 21 OR k <> 167 OR s <> 44150 OR l <> 98 THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
