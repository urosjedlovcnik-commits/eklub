// SQL za uvoz pregledanih jesenskih treningov (po 1. 7. 2026). Vse ali nič, z vgrajeno kontrolo.
// Uporaba: node treningi_uvoz/sql_uvoz_jesen.js > SQL/uvoz_zvezek_jesen.sql
const core = require('../treningi-core.js');
const data = require('./zvezek_2026.json');

const P = { razplavanje: 'R', ogrevalna: 'O', vaje: 'V', vmesno_razplavanje: 'M', glavna: 'G', zakljucek: 'Z', zakljucno_razplavanje: 'K' };
const sqlFp = t => t.toUpperCase().replace(/\( /g, '(').replace(/ \)/g, ')');
const list = data.trainings.filter(t => t.reviewed && t.date > '2026-07-01');
let items = 0, meters = 0, lib = 0;
const libKeys = new Set();
const json = list.map(t => ({
  d: t.date, l: t.levels.slice().sort().join(''), o: t.order_variant === 'glavna_takoj' ? 1 : 0, m: t.total_meters,
  e: core.estimateMinutes(t.total_meters, core.historyLevel(t.levels)),
  i: t.items.map(it => {
    if (it.incomplete) throw new Error('Negotova vrstica: ' + t.date + ' ' + it.text);
    items++; meters += it.meters;
    const fp = core.fingerprint(it.text);
    if (core.LIBRARY_PHASES.includes(it.phase)) { lib++; libKeys.add(it.phase + '|' + fp); }
    const row = [P[it.phase], it.text, it.meters];
    const sprint = it.phase === 'glavna' && core.isSprintTexts([it.text]);
    if (fp !== sqlFp(it.text) || sprint) row.push(fp === sqlFp(it.text) ? null : fp);
    if (sprint) row.push('sprint');
    return row;
  })
}));
if (JSON.stringify(json).includes('$j$')) throw new Error('$j$ v besedilu');
process.stdout.write(`-- Uvoz ${list.length} pregledanih jesenskih treningov iz zvezka 2026 (potrjeno 23. 11. 2026). Vse ali nič.
-- Zgenerirano s treningi_uvoz/sql_uvoz_jesen.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := 'Uvoz iz zvezka 2026 (pregledano, jesen)';
  n int; s bigint; l int; k int;
BEGIN
  CREATE TEMP TABLE _t ON COMMIT DROP AS
  SELECT (x->>'d')::date AS d, string_to_array(regexp_replace(x->>'l', '(.)(?=.)', '\\1,', 'g'), ',') AS lv,
         CASE WHEN (x->>'o') = '1' THEN 'glavna_takoj' ELSE 'obicajni' END AS ord, (x->>'m')::int AS m, (x->>'e')::int AS e, x->'i' AS items
  FROM jsonb_array_elements($j$${JSON.stringify(json)}$j$::jsonb) x;

  IF EXISTS (SELECT 1 FROM _t JOIN public.trainings t ON t.trainer_id = o AND t.date = _t.d AND t.levels = _t.lv) THEN
    RAISE EXCEPTION 'Kateri od treningov je že v bazi';
  END IF;

  CREATE TEMP TABLE _i ON COMMIT DROP AS
  SELECT _t.d, _t.lv, (i.ord - 1)::int AS pos,
         CASE i.v->>0 WHEN 'R' THEN 'razplavanje' WHEN 'O' THEN 'ogrevalna' WHEN 'V' THEN 'vaje' WHEN 'M' THEN 'vmesno_razplavanje'
                      WHEN 'G' THEN 'glavna' WHEN 'Z' THEN 'zakljucek' WHEN 'K' THEN 'zakljucno_razplavanje' END AS phase,
         i.v->>1 AS txt, (i.v->>2)::int AS m,
         coalesce(i.v->>3, replace(replace(upper(i.v->>1), '( ', '('), ' )', ')')) AS fp, i.v->>4 AS main_type
  FROM _t CROSS JOIN LATERAL jsonb_array_elements(_t.items) WITH ORDINALITY AS i(v, ord);

  -- Serije; če serija že obstaja, se ji samo dodajo nivoji.
  INSERT INTO public.training_sets AS ts (trainer_id, phase, levels, text, structure, meters, fingerprint, main_type, source, notes)
  SELECT o, phase, (SELECT array_agg(DISTINCT u ORDER BY u) FROM _i j, unnest(j.lv) u WHERE j.phase = i.phase AND j.fp = i.fp),
         min(txt), jsonb_build_object('v', 1, 'meters', min(m)), min(m), fp, min(main_type), 'uvoz', 'zvezek 2026'
  FROM _i i WHERE phase IN ('ogrevalna', 'vaje', 'glavna', 'zakljucek') GROUP BY phase, fp
  ON CONFLICT (trainer_id, phase, fingerprint) DO UPDATE
    SET levels = (SELECT array_agg(DISTINCT u ORDER BY u) FROM unnest(ts.levels || excluded.levels) u);
  GET DIAGNOSTICS k = ROW_COUNT;
  IF k <> ${libKeys.size} THEN RAISE EXCEPTION 'Serije: %', k; END IF;

  INSERT INTO public.trainings (trainer_id, term_id, date, levels, status, order_variant, total_meters, estimated_minutes, notes)
  SELECT o, (SELECT te.id FROM public.terms te JOIN public.trainer_terms tt ON tt.term_id = te.id
              WHERE tt.trainer_id = o AND te.day = extract(isodow FROM _t.d)::int
                AND _t.d BETWEEN coalesce(te.date_from, _t.d) AND coalesce(te.date_to, _t.d) LIMIT 1),
         _t.d, _t.lv, 'izveden', _t.ord, _t.m, _t.e, note
  FROM _t;

  INSERT INTO public.training_items (training_id, position, phase, set_id, text, structure, meters, fingerprint, level_variants)
  SELECT t.id, i.pos, i.phase,
         (SELECT x.id FROM public.training_sets x WHERE x.trainer_id = o AND x.phase = i.phase AND x.fingerprint = i.fp),
         i.txt, jsonb_build_object('v', 1, 'meters', i.m), i.m, i.fp, '{}'::jsonb
  FROM _i i JOIN public.trainings t ON t.trainer_id = o AND t.date = i.d AND t.levels = i.lv AND t.notes = note;

  SELECT count(DISTINCT t.id), count(i.id), sum(i.meters), count(i.set_id) INTO n, k, s, l
  FROM public.trainings t JOIN public.training_items i ON i.training_id = t.id WHERE t.trainer_id = o AND t.notes = note;
  IF n <> ${list.length} OR k <> ${items} OR s <> ${meters} OR l <> ${lib} THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
  IF EXISTS (SELECT 1 FROM public.trainings t WHERE t.trainer_id = o AND t.notes = note
             AND (t.term_id IS NULL OR t.total_meters <> (SELECT sum(i.meters) FROM public.training_items i WHERE i.training_id = t.id))) THEN
    RAISE EXCEPTION 'Trening brez termina ali z napačno vsoto';
  END IF;
END $do$;
`);
