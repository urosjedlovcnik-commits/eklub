// SQL za uvoz pregledanih (✔) treningov lanske sezone iz osnutka. Vse ali nič, z vgrajeno kontrolo.
// Uporaba: node treningi_uvoz/sql_uvoz_2025.js zvezek_2025_osnutek.txt 2025-09-01 2025-11-11 [--hash] > SQL/...
const fs = require('fs');
const path = require('path');
const core = require('../treningi-core.js');
const [file, from, to, flag] = process.argv.slice(2);

const PH = { R: 'razplavanje', O: 'ogrevalna', V: 'vaje', VR: 'vmesno_razplavanje', G: 'glavna', Z: 'zakljucek', ZR: 'zakljucno_razplavanje' };
const SHORT = { razplavanje: 'R', ogrevalna: 'O', vaje: 'V', vmesno_razplavanje: 'M', glavna: 'G', zakljucek: 'Z', zakljucno_razplavanje: 'K' };
const sqlFp = t => t.toUpperCase().replace(/\( /g, '(').replace(/ \)/g, ')');

const list = [];
let cur = null, last = null;
fs.readFileSync(path.join(__dirname, file), 'utf8').split(/\r?\n/).forEach(raw => {
  const line = raw.trim();
  if (!line) return;
  const h = line.match(/^#\s*(\d{4}-\d{2}-\d{2})\s+([ABC,]+)\s+([\d.]+)\s*(✔)?$/);
  if (h) { cur = h[4] && h[1] >= from && h[1] <= to ? { date: h[1], levels: h[2].split(',').sort(), items: [] } : null; if (cur) list.push(cur); last = null; return; }
  if (!cur) return;
  const b = line.match(/^#B (.*)$/);
  if (b) { cur.items[cur.items.length - 1].b = b[1].replace(/ \/ (?![^(]*\))/g, '\n'); return; }
  if (line.startsWith('#')) return;
  const m = line.match(/^(VR|ZR|R|O|V|G|Z)(\?)?\s+(.*)$/);
  if (!m || m[2]) throw new Error('Neznana ali negotova vrstica: ' + cur.date + ' ' + line);
  if (m[1] === 'G' && last === 'G') cur.items[cur.items.length - 1].text += '\n' + m[3];
  else cur.items.push({ phase: PH[m[1]], text: core.tidyText(m[3]) });
  last = m[1];
});

let items = 0, meters = 0, lib = 0;
const libKeys = new Set();
list.forEach(t => {
  t.items.forEach(i => { i.meters = core.parseText(i.text, new Map()).meters; i.fp = core.fingerprint(i.text); });
  t.total = t.items.reduce((a, i) => a + i.meters, 0);
  const gi = t.items.findIndex(i => i.phase === 'glavna'), vi = t.items.findIndex(i => i.phase === 'vaje');
  t.order = gi >= 0 && gi < vi ? 'glavna_takoj' : 'obicajni';
});
if (flag === '--hash') {
  const md5 = s => require('crypto').createHash('md5').update(s).digest('hex').slice(0, 6);
  console.log(list.map(t => `${t.date}${t.levels.join('')}:${md5(t.items.map(i => i.phase + i.text + '#' + i.fp + i.meters + (i.b || '')).join('|'))}:${t.order}${t.total}`).sort().join(' '));
  process.exit(0);
}
const json = list.map(t => ({
  d: t.date, l: t.levels.join(''), o: t.order === 'glavna_takoj' ? 1 : 0, m: t.total, e: core.estimateMinutes(t.total, core.historyLevel(t.levels)),
  i: t.items.map(i => {
    items++; meters += i.meters;
    if (core.LIBRARY_PHASES.includes(i.phase)) { lib++; libKeys.add(i.phase + '|' + i.fp); }
    const row = [SHORT[i.phase], i.text, i.meters];
    if (i.fp !== sqlFp(i.text) || i.b) row.push(i.fp !== sqlFp(i.text) ? i.fp : null);
    if (i.b) row.push(i.b);
    return row;
  })
}));
if (JSON.stringify(json).includes('$j$')) throw new Error('$j$ v besedilu');
const note = `Uvoz iz zvezka 2025/26 (${from}–${to})`;
process.stdout.write(`-- Uvoz ${list.length} pregledanih treningov lanske sezone (${from} do ${to}). Vse ali nič. Zgenerirano s treningi_uvoz/sql_uvoz_2025.js.
DO $do$
DECLARE
  o uuid := (SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1);
  note text := '${note}';
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
         coalesce(i.v->>3, replace(replace(upper(i.v->>1), '( ', '('), ' )', ')')) AS fp, i.v->>4 AS b
  FROM _t CROSS JOIN LATERAL jsonb_array_elements(_t.items) WITH ORDINALITY AS i(v, ord);

  INSERT INTO public.training_sets AS ts (trainer_id, phase, levels, text, structure, meters, fingerprint, source, notes)
  SELECT o, phase, (SELECT array_agg(DISTINCT u ORDER BY u) FROM _i j, unnest(j.lv) u WHERE j.phase = i.phase AND j.fp = i.fp),
         min(txt), jsonb_build_object('v', 1, 'meters', min(m)), min(m), fp, 'uvoz', 'zvezek 2025/26'
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
         i.txt, jsonb_build_object('v', 1, 'meters', i.m), i.m, i.fp,
         CASE WHEN i.b IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('B', jsonb_build_object('text', i.b)) END
  FROM _i i JOIN public.trainings t ON t.trainer_id = o AND t.date = i.d AND t.levels = i.lv AND t.notes = note;

  SELECT count(DISTINCT t.id), count(i.id), sum(i.meters), count(i.set_id) INTO n, k, s, l
  FROM public.trainings t JOIN public.training_items i ON i.training_id = t.id WHERE t.trainer_id = o AND t.notes = note;
  IF n <> ${list.length} OR k <> ${items} OR s <> ${meters} OR l <> ${lib} THEN
    RAISE EXCEPTION 'Kontrola: treningov %, postavk %, metrov %, povezanih %', n, k, s, l;
  END IF;
END $do$;
`);
