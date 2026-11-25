-- Uvoz 1 pregledanih treningov lanske sezone (2025-11-13 do 2025-11-13). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2025/26 (2025-11-13–2025-11-13)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$[{"d":"2025-11-13","l":"AB","o":1,"m":2300,"e":33,"i":[["R","300 RAZP",300],["O","4x100 75 K + 25 M",400,null,"3x100 75 K + 25 M"],["G","4x( 25 / 50 / 75 / 100 ) VSE ISTI TEMPO",1000,null,"2x( 25\n50\n75\n100 ) VSE ISTI TEMPO"],["M","100 RAZP",100],["V","2x100 PL KN",200],["V","10x25 PL ↑KV 2-2 ČIM DALJŠI ↓K MAX NOGE POČASI ZAVESLJAJI",250],["K","50 RAZP",50]]}]$j$::jsonb) x;

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
  IF k <> 4 THEN RAISE EXCEPTION 'Serije: %', k; END IF;

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
  IF n <> 1 OR k <> 7 OR s <> 2300 OR l <> 4 THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
