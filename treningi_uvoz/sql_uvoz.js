// Iz zvezek_2026.json (samo pregledani treningi, ✔) in kratic iz pregleda zgradi SQL za uvoz.
// Uporaba: node treningi_uvoz/sql_uvoz.js > SQL/uvoz_zvezek_pregled_1.sql
const core = require('../treningi-core.js');
const data = require('./zvezek_2026.json');

const OWNER = "(SELECT id FROM public.trainers WHERE email = 'uros.jedlovcnik@gmail.com' LIMIT 1)";
const q = (s) => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'";
const arr = (a) => q('{' + a.join(',') + '}') + '::text[]';
const js = (o) => q(JSON.stringify(o)) + '::jsonb';

// Razlage iz pregleda zvezka (22. 11. 2026).
const EXPLAIN = {
  CT: 'Cela tehnika (celo plavanje).',
  N: 'Noge; N/V/CT = noge / vaje / cela tehnika po dolžinah ali po ponovitvah.',
  BD: 'Brez dihanja (KBD = kravl brez dihanja).',
  KVL: 'Kravl z valčkom in lopatkami (K + VL).',
  ZD: 'Z desko (DE).',
  KZ: 'Kravl vaja zavesljaji; dve različici: dihanje na stran zavesljaja in dihanje kontra (KZ DK).',
  PPV: 'Prsno pod vodo.',
  POPAJ: 'Ena od vaj sculling.',
  DOLGO: 'NA DOLGO = počasi; pri KV pomeni dolg zavesljaj.',
  BOK: 'Noge na boku (KN BOK, DN BOK).',
  OBRAT: 'MAX OBRAT = šprint v obrat in iz njega, čim hitreje.',
  DIH: 'Na koliko zavesljajev vdihneš; DIH 3-5-7 pri 75 m = vsakih 25 m drugače; DIH NA 1 = ob vsakem zavesljaju.',
  ZAMIKOM: 'Mešano z zamikom: pravilni red D, H, P, K; vsakih 100 m začneš z naslednjo tehniko.',
  ČMZ: 'Čim manj zavesljajev na dolžino.',
  NPV: 'Noge pod vodo.',
  PD: 'Prsno drsenje (vaja).',
  HITLER: 'HV: roka gre ven iz vode, pri 90° se dotakneš prsnega koša, nato nadaljuješ.',
  PREVAL: 'Preval (npr. 8x25 PL + PREVAL).',
  STIL: 'Prosta izbira tehnike; plavalci izberejo sami.',
  PESTI: 'RRU s stisnjeno pestjo.',
  PALEC: 'RRU: s palcem se dotakneš stegna in pazduhe.',
  ŠPRICANJE: 'RRU ali vaterpolo: ob koncu potega izpljuskneš vodo ven.',
  GERMANJA: 'Pomožna tehnika; za razplavanje ali s hrbtno nogami kot vaja za podvodni del hrbtnega potega.',
  ORKA: 'Delfin noge, samo podvodni del zavesljaja, roke vrneš naprej.',
  ROTACIJA: 'Predvsem pri hrbtno nogah ali vajah za rotacijo ramenskega obroča.',
  SIMULATOR: 'Vaja hitrosti: 50 m, natanko 10 s počitka, 50 m; vsota je simuliran čas na tekmi.',
  PACMAN: 'Z lopatkami: lopatko držiš na dnu, sili te v pravilen poteg.',
  ZADUŠNICA: 'Zadnjih 7 m pod vodo: potopiš se in v cilj prideš z delfin nogami.',
  ROTULJICA: 'Metuljček, pomožna tehnika med delfinom in prsnim.',
  KRAJŠANJE: 'PV: trije zaporedni zavesljaji, vsak krajši (dolg, srednji, kratek), nato spet dolg.',
  RINEŠ: 'RRU: dlan med vračanjem naprej pod vodo porineš naprej.',
  BP: 'Brez prsnega (MM BP = mešano menjajoče brez prsnega).'
};
const EXTRA = [
  ['3+1', '3 tempo, 1 hitro', 'stopnjevanje', 'Lahko v kateri koli tehniki.'],
  ['2+1', '2 tempo, 1 hitro', 'stopnjevanje', 'Lahko v kateri koli tehniki.'],
  ['4-3-2-1', 'razdelitev intenzivnosti: 4 POČ, 3 T, 2 HIT, 1 Max', 'stopnjevanje', 'Npr. 10x50 PL K 4-3-2-1 @55".'],
  ['L/D', '25 m leva roka, 25 m desna roka', 'vaja', 'Npr. 8x50 KV L/D.'],
  ['6-1', 'vaja hrbtno: na 6 udarcev nog zamenjaš roki', 'vaja', null],
  ['1-1-2', 'vaja delfin: 1 zavesljaj z levo, 1 z desno, 2 cela koordinacija', 'vaja', '2-2-2 je enaka vaja z enim zavesljajem več.'],
  ['ROKA UZ ZAVES', 'HV, kombinacija z 90°: hrbtno zavesljaji, druga roka je zunaj', 'vaja', null],
  ['MENJAMO POLOŽAJ', 'pri DN: hrbet, trebuh, en bok, drugi bok', 'vaja', null],
  ['ČIM DLJE POD VODO', 'plavanje pod vodo: prsno, kravl, delfin ali hrbtno noge', 'vaja', null],
  ['VISOK KOMOLEC', 'čim višje zarotiraš ramenski obroč, dvigneš ramo in komolec', 'vaja', 'Kot K CT ali KV RRU visok komolec.'],
  ['90°', 'noge hrbtno ali kravl z roko iz vode; ali hrbtno RRU, kjer roka čaka zunaj', 'vaja', null]
];
const UPDATE_EXPL = {
  SUPERMAN: 'Kravl noge, ena roka ob telesu, druga spredaj; dihaš na stran.',
  SHARK: 'SHARK 1: komolec zadržiš visoko nad ramo 2–3 s, nato nadaljuješ. SHARK 2: ko pride komolec do rame, roko vrneš ob telo, nato cel zavesljaj. SHARK 3: roko vrneš ob telo in pod vodo naprej do izhodišča, nato cel zavesljaj.',
  VATERPOLO: 'Kravl z glavo nad vodo.',
  SCULLING: 'Sklop vaj za občutek za vodo; plava se zelo počasi (npr. POPAJ).',
  ZADRGA: 'RRU (zipper): s palcem vlečeš po robu telesa ves čas do rame.',
  RRU: 'Roka roka ujame: sklop kravl vaj, kjer roka vedno počaka drugo (PESTI, PALEC, ZADRGA, ŠPRICANJE, RINEŠ).',
  DV: 'Delfin vaje. DV 3-3 = 3x noge, 3x cela koordinacija; DV 2-2-1 je različica.'
};

const out = [];
out.push('-- Uvoz po pregledu zvezka s trenerjem (22. 11. 2026): šifrant in pregledani treningi (✔).');
out.push('-- Zgenerirano s treningi_uvoz/sql_uvoz.js. Ponovljivo (obstoječe vrstice se preskočijo).');
out.push('BEGIN;');
out.push('');
out.push('-- 1) Kratice iz pregleda');
const codes = core.REVIEW_CODES.map(c => [c.code, c.meaning, c.category, EXPLAIN[c.code] || null]).concat(EXTRA);
out.push('INSERT INTO public.training_codes (code, meaning, category, explanation, created_by)');
out.push(`SELECT v.code, v.meaning, v.category, v.explanation, ${OWNER}`);
out.push('FROM (VALUES');
out.push(codes.map(c => `  (${q(c[0])}, ${q(c[1])}, ${q(c[2])}, ${q(c[3])})`).join(',\n'));
out.push(') AS v(code, meaning, category, explanation)');
out.push('WHERE NOT EXISTS (SELECT 1 FROM public.training_codes x WHERE upper(x.code) = upper(v.code)');
out.push('                    OR upper(v.code) = ANY (SELECT upper(a) FROM unnest(x.aliases) a))');
out.push('ON CONFLICT ((lower(code))) DO NOTHING;');
out.push('');
out.push('-- 2) Razlage obstoječih vaj');
Object.entries(UPDATE_EXPL).forEach(([code, ex]) => out.push(`UPDATE public.training_codes SET explanation = ${q(ex)} WHERE code = ${q(code)};`));
out.push('');

const reviewed = data.trainings.filter(t => t.reviewed);
// Kratice, ki so že v bazi (da razbiralnik npr. PL ne razbije na P + L).
const DB_CODES = 'P K H D M MM V L VL PL ML DE MAD T HIT Max POČ ST RG RAZP VB1T DV KV HV PV MN DN KN HN PN MV SUPERMAN SCULLING VATERPOLO ZADRGA SHARK RRU'
  .split(' ').map(code => ({ code, meaning: code, category: 'drugo', aliases: { HIT: ['HITRO'], T: ['TEMPO'], 'POČ': ['POČASI'], DE: ['DESKA', 'DESKO'], ST: ['STOP'], Max: ['MAX'], RAZP: ['RAZ'] }[code] || [] }));
const dict = core.buildDict(DB_CODES);
const lib = core.libraryFromTrainings(reviewed, dict);
const setsJson = lib.sets.map(s => ({ p: s.phase, l: s.levels.slice().sort(), t: s.text, m: core.parseText(s.text, dict).meters, f: s.fingerprint, s: s.main_type || null }));
const trJson = reviewed.map(t => ({
  d: t.date, l: t.levels.slice().sort(), o: t.order_variant, tm: t.total_meters, em: core.estimateMinutes(t.total_meters, core.historyLevel(t.levels)),
  i: t.items.map(it => ({ p: it.phase, t: it.text, m: core.parseText(it.text, dict).meters, f: core.fingerprint(it.text) }))
}));
const J = (o) => '$j$' + JSON.stringify(o) + '$j$::jsonb';
const NOTE = 'Uvoz iz zvezka 2026 (pregledano)';
out.push(`-- 3) Serije v knjižnico (${setsJson.length})`);
out.push(`INSERT INTO public.training_sets (trainer_id, phase, levels, text, structure, meters, fingerprint, main_type, source, notes)
SELECT ${OWNER}, x->>'p', ARRAY(SELECT jsonb_array_elements_text(x->'l')), x->>'t',
       jsonb_build_object('v', 1, 'meters', (x->>'m')::int), (x->>'m')::int, x->>'f', x->>'s', 'uvoz', 'zvezek 2026'
FROM jsonb_array_elements(${J(setsJson)}) x
ON CONFLICT (trainer_id, phase, fingerprint) DO NOTHING;`);
out.push('');
out.push(`-- 4) Treningi v zgodovino, status izveden (${trJson.length})`);
out.push(`CREATE TEMP TABLE _uvoz ON COMMIT DROP AS SELECT x FROM jsonb_array_elements(${J(trJson)}) x;
INSERT INTO public.trainings (trainer_id, term_id, date, levels, status, order_variant, total_meters, estimated_minutes, notes)
SELECT o.id,
       (SELECT te.id FROM public.terms te JOIN public.trainer_terms tt ON tt.term_id = te.id
         WHERE tt.trainer_id = o.id AND te.day = extract(isodow FROM (x->>'d')::date)::int
           AND (x->>'d')::date BETWEEN coalesce(te.date_from, (x->>'d')::date) AND coalesce(te.date_to, (x->>'d')::date) LIMIT 1),
       (x->>'d')::date, ARRAY(SELECT jsonb_array_elements_text(x->'l')), 'izveden', x->>'o', (x->>'tm')::int, (x->>'em')::int, ${q(NOTE)}
FROM _uvoz, (SELECT ${OWNER} AS id) o
WHERE NOT EXISTS (SELECT 1 FROM public.trainings t WHERE t.trainer_id = o.id AND t.date = (x->>'d')::date
                  AND t.levels = ARRAY(SELECT jsonb_array_elements_text(x->'l')));
INSERT INTO public.training_items (training_id, position, phase, set_id, text, structure, meters, fingerprint, level_variants)
SELECT tr.id, (i.ord - 1)::int, i.v->>'p',
       (SELECT s.id FROM public.training_sets s WHERE s.trainer_id = tr.trainer_id AND s.phase = i.v->>'p' AND s.fingerprint = i.v->>'f'),
       i.v->>'t', jsonb_build_object('v', 1, 'meters', (i.v->>'m')::int), (i.v->>'m')::int, i.v->>'f', '{}'::jsonb
FROM _uvoz
JOIN public.trainings tr ON tr.trainer_id = ${OWNER} AND tr.date = (x->>'d')::date
     AND tr.levels = ARRAY(SELECT jsonb_array_elements_text(x->'l')) AND tr.notes = ${q(NOTE)}
CROSS JOIN LATERAL jsonb_array_elements(x->'i') WITH ORDINALITY AS i(v, ord)
WHERE NOT EXISTS (SELECT 1 FROM public.training_items e WHERE e.training_id = tr.id);`);
out.push('');
out.push('COMMIT;');
process.stdout.write(out.join('\n') + '\n');
