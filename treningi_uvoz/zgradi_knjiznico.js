// Iz zvezek_2026.txt zgradi zvezek_2026.json (treningi po fazah) in izpiše kontrolo metrov.
// Uporaba: node treningi_uvoz/zgradi_knjiznico.js
const fs = require('fs');
const path = require('path');
const core = require('../treningi-core.js');

const PH = { R: 'razplavanje', O: 'ogrevalna', V: 'vaje', VR: 'vmesno_razplavanje', G: 'glavna', 'G!': 'glavna', Z: 'zakljucek', ZR: 'zakljucno_razplavanje' };
const src = fs.readFileSync(path.join(__dirname, 'zvezek_2026.txt'), 'utf8').split(/\r?\n/);
const dict = core.buildDict([
  ...'P K H D M MM V L VL PL ML DE MAD T HIT POČ ST RG RAZP VB1T DV KV HV PV MN DN KN HN PN SUPERMAN SCULLING VATERPOLO ZADRGA'
    .split(' ').map(code => ({ code, meaning: code, category: 'drugo' }))
]);

const trainings = [];
let cur = null;
let lastPhase = null;
for (const raw of src) {
  const line = raw.trim();
  if (!line) continue;
  const h = line.match(/^#\s*(\d{4}-\d{2}-\d{2})\s+([ABC,]+)\s+([\d.]+)\s*(✔)?/);
  if (h) {
    cur = { date: h[1], levels: h[2].split(','), notebook_km: +h[3], reviewed: !!h[4], items: [] };
    trainings.push(cur); lastPhase = null; continue;
  }
  if (line.startsWith('#') || !cur) continue;
  const m = line.match(/^(G!|VR|ZR|R|O|V|G|Z)\s+(.*)$/);
  if (!m) throw new Error('Neznana vrstica: ' + line);
  const phase = PH[m[1]];
  const sprint = m[1] === 'G!';
  const prev = cur.items[cur.items.length - 1];
  if (phase === 'glavna' && prev && prev.phase === 'glavna' && lastPhase === 'glavna') {
    prev.text += '\n' + m[2];
    if (sprint) prev.main_type = 'sprint';
  } else {
    const it = { phase, text: m[2] };
    if (sprint) it.main_type = 'sprint';
    cur.items.push(it);
  }
  lastPhase = phase;
}

let warn = 0;
const unknown = new Map();
for (const t of trainings) {
  t.order_variant = t.items.findIndex(i => i.phase === 'glavna') < t.items.findIndex(i => i.phase === 'vaje') ? 'glavna_takoj' : 'obicajni';
  let total = 0;
  for (const it of t.items) {
    const p = core.parseText(it.text, dict);
    it.meters = p.meters;
    total += p.meters;
    p.unknown.forEach(u => unknown.set(u, (unknown.get(u) || 0) + 1));
    if (p.lines.some(l => l.noLength)) { console.log('  brez dolžine:', t.date, it.text); warn++; }
  }
  t.total_meters = total;
  const diff = total - Math.round(t.notebook_km * 1000);
  console.log(`${t.date} ${t.levels.join('+').padEnd(3)} ${String(total).padStart(4)} m  zvezek ${t.notebook_km.toFixed(2)}  ${diff ? 'razlika ' + diff : ''}`);
}
console.log(`\n${trainings.length} treningov, opozoril ${warn}`);
console.log('Neznane besede:', Array.from(unknown.entries()).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}(${v})`).join(' '));

const lib = core.libraryFromTrainings(trainings, dict);
console.log('Knjižnica:', core.LIBRARY_PHASES.map(p => `${p} ${lib.sets.filter(s => s.phase === p).length}`).join(', '));
fs.writeFileSync(path.join(__dirname, 'zvezek_2026.json'), JSON.stringify({ source: 'zvezek 2026', built: new Date().toISOString().slice(0, 10), trainings }, null, 1));
