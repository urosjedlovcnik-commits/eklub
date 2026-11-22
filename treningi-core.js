// Jedro sestavljanja treningov: razčlenjevalnik kratic, prstni odtis serije,
// različica za nivo B in generator predlogov. Brez DOM-a, deluje v brskalniku in v Nodu.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TreningiCore = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PHASES = ['razplavanje', 'ogrevalna', 'vaje', 'vmesno_razplavanje', 'glavna', 'zakljucek', 'zakljucno_razplavanje'];
  const PHASE_LABELS = {
    razplavanje: 'Razplavanje',
    ogrevalna: 'Ogrevalna serija',
    vaje: 'Vaje',
    vmesno_razplavanje: 'Vmesno razplavanje',
    glavna: 'Glavna serija',
    zakljucek: 'Zaključek',
    zakljucno_razplavanje: 'Zaključno razplavanje'
  };
  // Faze, ki se shranjujejo v knjižnico (razplavanja so fiksna).
  const LIBRARY_PHASES = ['ogrevalna', 'vaje', 'glavna', 'zakljucek'];

  const DEFAULT_SETTINGS = {
    session_minutes: 60,
    main_repeat_days: 60,
    sprint_min_gap_days: 14,
    sprint_force_days: 21,
    levels: {
      A: { meters_min: 2200, meters_max: 2500, warmup_m: 300, pace_per_100_sec: 85 },
      B: { meters_min: 2200, meters_max: 2500, warmup_m: 300, pace_per_100_sec: 85 },
      C: { meters_min: 1400, meters_max: 1700, warmup_m: 200, pace_per_100_sec: 120 }
    },
    b_variant: { reps_minus: 1, min_reps_to_reduce: 4 },
    highlight_order_choice_weekdays: [1],
    // Dan v tednu (1 = ponedeljek) -> skupine nivojev, ki imajo vsaka svoj trening.
    day_levels: { 1: [['A', 'B']], 3: [['A'], ['C']], 4: [['A', 'B']] },
    // Privzeti štart glavne serije, če ni zapisan (sekunde po dolžini).
    default_start_sec: { 50: 60, 75: 90, 100: 120, 200: 210 }
  };

  // Kratice, potrjene v pregledu zvezka 22. 11. 2026, ki še niso v bazi.
  // V zavihku Šifrant jih trener z gumbom doda v bazo.
  const REVIEW_CODES = [
    ['CT', 'cela tehnika', 'izpeljava'],
    ['N', 'noge', 'izpeljava'],
    ['BD', 'brez dihanja', 'drugo'],
    ['MBK', 'mešano brez kravla', 'tehnika'],
    ['MBD', 'mešano brez delfina', 'tehnika'],
    ['MBP', 'mešano brez prsnega', 'tehnika'],
    ['BP', 'brez prsnega', 'drugo'],
    ['KVL', 'kravl z valčkom in lopatkami', 'tehnika'],
    ['ZD', 'z desko', 'rekvizit'],
    ['STOP', 'stopnjevano', 'stopnjevanje'],
    ['KZ', 'kravl, vaja zavesljaji (dihanje na stran ali kontra)', 'vaja'],
    ['PPV', 'prsno pod vodo', 'vaja'],
    ['POPAJ', 'vaja sculling', 'vaja'],
    ['DOLGO', 'počasi (pri KV dolg zavesljaj)', 'intenzivnost'],
    ['BOK', 'noge na boku', 'vaja'],
    ['OBRAT', 'obrat (MAX OBRAT = šprint v obrat in iz njega)', 'drugo'],
    ['DIH', 'dihanje na N zavesljajev (DIH 3-5-7)', 'drugo'],
    ['ZAMIKOM', 'mešano z zamikom: vsakih 100 m začneš z naslednjo tehniko', 'drugo'],
    ['ČMZ', 'čim manj zavesljajev', 'vaja'],
    ['NPV', 'noge pod vodo', 'vaja'],
    ['PD', 'prsno drsenje', 'vaja'],
    ['HITLER', 'HV: roka ven iz vode, pri 90° dotik prsnega koša', 'vaja'],
    ['PREVAL', 'preval', 'vaja'],
    ['STIL', 'prosta izbira tehnike', 'drugo'],
    ['RRU', 'roka roka ujame (sklop vaj)', 'vaja'],
    ['PESTI', 'RRU s stisnjeno pestjo', 'vaja'],
    ['PALEC', 'RRU: palec se dotakne stegna in pazduhe', 'vaja'],
    ['ŠPRICANJE', 'RRU/vaterpolo: ob koncu potega izpljuskneš vodo', 'vaja'],
    ['GERMANJA', 'pomožna tehnika (podvodni del hrbtnega potega)', 'vaja'],
    ['ORKA', 'delfin noge s podvodnim delom zavesljaja', 'vaja'],
    ['ROTACIJA', 'rotacija ramenskega obroča', 'vaja'],
    ['SIMULATOR', '50 m + natanko 10 s + 50 m, simuliran čas tekme', 'vaja'],
    ['PACMAN', 'z lopatkami, lopatka na dnu', 'vaja'],
    ['ZADUŠNICA', 'zadnjih 7 m pod vodo z delfin nogami', 'vaja'],
    ['ROTULJICA', 'metuljček, pomožna tehnika med delfinom in prsnim', 'vaja'],
    ['KRAJŠANJE', 'PV: trije vse krajši zavesljaji', 'vaja'],
    ['RINEŠ', 'RRU: dlan pod vodo porineš naprej', 'vaja'],
    ['SHARK', 'kravl vaja s komolcem nad ramo (SHARK 1/2/3)', 'vaja'],
    ['NOGE', 'noge', 'izpeljava'],
    ['VAJE', 'vaje', 'izpeljava'],
    ['MAX', 'maksimalno', 'intenzivnost'],
    ['SPRINT', 'šprint', 'intenzivnost'],
    ['NORMALNO', 'normalno plavanje', 'drugo']
  ].map(([code, meaning, category]) => ({ code, meaning, category, aliases: [], source: 'pregled' }));

  // Besede v opisih vaj, ki niso kratice in jih ne označujemo kot neznane.
  const FILLER = new Set(('Z NA PO POD ČIM DLJE DALJŠI VIŠJI VODO BREZ DIHANJA DIHANJE VDIHA VSAK VSAKIČ ROKA ROKE UZ ZAVES ' +
    'ZAVESLJAJI ZAVESLJAJ VISOK KOMOLEC KOMOLCEM POLOŽAJ MENJAMO KONTRA HITRO POČASI TEMPO MEŠANO PRSNO KRAVL ' +
    'HRBTNO DELFIN DESKA DESKO VALČEK LOP RAMENA IN ALI ŠTARTI ŠTART X 1. 2. 3. CT/N/V/CT N/V/CT DO TAKOJ').split(/\s+/));

  const TECH_PREFIXES = ['MM', 'K', 'H', 'P', 'D', 'M'];
  const SUFFIXES = ['RRU', 'VL', 'PL', 'BD', 'CT', 'ML', 'N', 'V', 'L', 'Z', 'R'];

  function buildDict(dbCodes, includeReview) {
    const dict = new Map();
    const add = (c, source) => {
      const entry = { code: c.code, meaning: c.meaning, category: c.category, source };
      [c.code].concat(c.aliases || []).forEach(k => {
        const key = String(k).toUpperCase();
        if (!dict.has(key)) dict.set(key, entry);
      });
    };
    (dbCodes || []).forEach(c => add(c, 'db'));
    if (includeReview !== false) REVIEW_CODES.forEach(c => add(c, 'pregled'));
    return dict;
  }

  const TIME_RE = /^(?:(\d{1,2})')?(?:(\d{1,2})(?:"|''))?$/;
  function parseTime(tok) {
    const m = String(tok).match(TIME_RE);
    if (!m || (!m[1] && !m[2])) return null;
    return (parseInt(m[1] || '0', 10) * 60) + parseInt(m[2] || '0', 10);
  }
  function formatTime(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    if (!m) return `${s}"`;
    return s ? `${m}'${String(s).padStart(2, '0')}"` : `${m}'`;
  }

  function cleanQuotes(s) {
    return String(s || '')
      .replace(/[’‘´`]/g, "'")
      .replace(/[”“″]/g, '"')
      .replace(/''/g, '"')
      .replace(/×/g, 'x');
  }

  function lookup(word, dict) {
    const key = word.toUpperCase();
    if (dict.has(key)) return [dict.get(key).code];
    if (FILLER.has(key)) return [];
    // Sestavljene kratice: tehnika + izpeljave, npr. KVL, KRRU, KBD, HN, DN.
    for (const pre of TECH_PREFIXES) {
      if (!key.startsWith(pre) || key === pre) continue;
      let rest = key.slice(pre.length);
      const parts = [pre];
      let ok = true;
      while (rest) {
        const suf = SUFFIXES.find(s => rest.startsWith(s));
        if (!suf) { ok = false; break; }
        parts.push(suf);
        rest = rest.slice(suf.length);
      }
      if (ok) return parts;
    }
    return null;
  }

  function scanTokens(str, dict, out) {
    const toks = String(str || '').replace(/[()]/g, ' ').split(/\s+/).filter(Boolean);
    for (let raw of toks) {
      let t = raw.replace(/^[↑↓]+/, '').replace(/[,;:]+$/, '');
      if (!t || /^[+\-–/↑↓=]+$/.test(t)) continue;
      if (t[0] === '@') {
        const sec = parseTime(t.slice(1));
        if (sec != null) out.regimes.push({ type: '@', sec });
        continue;
      }
      if (/^p\d/i.test(t)) {
        const sec = parseTime(t.slice(1));
        if (sec != null) { out.regimes.push({ type: 'p', sec }); continue; }
      }
      const sec = parseTime(t);
      if (sec != null && /['"]/.test(t)) { out.regimes.push({ type: '@', sec, bare: true }); continue; }
      if (/^\d+\.?$/.test(t) || /^\d+[x×]$/i.test(t) || /^\d+°$/.test(t)) continue;
      if (/^\d+([+\-/]\d+)+$/.test(t)) { out.params.push(t); continue; }
      const mx = t.match(/^\d+[x×](.+)$/i);
      if (mx) t = mx[1];
      if (t.endsWith('!')) { out.codes.push('Max'); t = t.replace(/!+$/, ''); if (!t) continue; }
      const pieces = t.includes('/') ? t.split('/') : [t];
      for (const p of pieces) {
        if (!p) continue;
        if (/^\d+$/.test(p) || /^\d+([+\-]\d+)+$/.test(p)) continue;
        const found = lookup(p, dict);
        if (found === null) out.unknown.push(p.toUpperCase());
        else out.codes.push(...found);
      }
    }
  }

  function emptyLine(text) {
    return { text, reps: 1, dist: 0, meters: 0, regimes: [], codes: [], params: [], unknown: [], noLength: false };
  }

  function parseLine(line, dict) {
    const s = cleanQuotes(line).trim();
    const r = emptyLine(s);
    let m;
    if ((m = s.match(/^(\d+)\s*[xX]\s*\((.*)\)(.*)$/))) {
      r.reps = +m[1];
      const parts = m[2].split(/\s+\/\s+/).map(p => parseLine(p, dict));
      const per = parts.reduce((a, p) => a + p.meters, 0);
      r.meters = r.reps * per;
      r.parts = parts.map(p => ({ text: p.text, meters: p.meters }));
      parts.forEach(p => { r.regimes.push(...p.regimes); r.codes.push(...p.codes); r.unknown.push(...p.unknown); r.params.push(...p.params); });
      scanTokens(m[3], dict, r);
    } else if ((m = s.match(/^(\d+)\s*[xX]\s*(\d+)(?![\d'"])(.*)$/))) {
      r.reps = +m[1];
      r.dist = +m[2];
      r.meters = r.reps * r.dist;
      scanTokens(m[3], dict, r);
    } else if (/^\d+\s/.test(s) && s.split(/\s*[+,]\s*/).length >= 2 &&
               s.split(/\s*[+,]\s*/).every(seg => /^\d+(\s|$)/.test(seg))) {
      r.meters = s.split(/\s*[+,]\s*/).reduce((a, seg) => a + parseInt(seg, 10), 0);
      scanTokens(s.replace(/(^|[+,]\s*)\d+/g, ' '), dict, r);
    } else if ((m = s.match(/^(\d+)(?![\d'"xX])(.*)$/))) {
      r.dist = +m[1];
      r.meters = r.dist;
      scanTokens(m[2], dict, r);
    } else {
      r.noLength = true;
      scanTokens(s, dict, r);
    }
    if (r.meters % 25 !== 0) r.noLength = true;
    r.unknown = Array.from(new Set(r.unknown));
    return r;
  }

  function parseText(text, dict) {
    const lines = cleanQuotes(text).split(/\n/).map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(l => parseLine(l, dict || new Map()));
    return {
      lines: parsed,
      meters: parsed.reduce((a, l) => a + l.meters, 0),
      unknown: Array.from(new Set(parsed.flatMap(l => l.unknown)))
    };
  }

  // Strnjena oblika za shranjevanje v stolpec structure (jsonb).
  function toStructure(parsed) {
    return {
      v: 1,
      lines: parsed.lines.map(l => ({
        reps: l.reps, dist: l.dist, meters: l.meters,
        regimes: l.regimes.map(x => ({ type: x.type, sec: x.sec })),
        codes: Array.from(new Set(l.codes)),
        params: l.params,
        parts: l.parts
      }))
    };
  }

  // "Povsem enak zapis": velike črke, enotni narekovaji, en presledek, gol čas -> @čas.
  function normalizeText(text) {
    return cleanQuotes(text).split(/\n/).map(l => l.trim()).filter(Boolean).map(l =>
      l.toUpperCase()
        .replace(/\s+/g, ' ')
        .replace(/@\s+/g, '@')
        .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
        .split(' ')
        .map(t => (parseTime(t) != null && /['"]/.test(t) ? '@' + t : t))
        .join(' ')
    ).join('\n');
  }
  const fingerprint = normalizeText;

  // Različica za nivo B: ena ponovitev manj, kjer je ponovitev vsaj min_reps_to_reduce.
  function bVariant(text, settings) {
    const cfg = (settings && settings.b_variant) || DEFAULT_SETTINGS.b_variant;
    let changed = false;
    const out = cleanQuotes(text).split(/\n/).map(line => line.replace(/^(\s*)(\d+)(\s*[xX])/, (all, sp, n, x) => {
      const reps = +n;
      if (reps >= cfg.min_reps_to_reduce) { changed = true; return sp + (reps - cfg.reps_minus) + x; }
      return all;
    })).join('\n');
    return { text: out, changed, note: changed ? '' : 'ni česa skrajšati: daljši štart ali + PL' };
  }

  function estimateMinutes(meters, levelKey, settings) {
    const lv = ((settings && settings.levels) || DEFAULT_SETTINGS.levels)[levelKey] || DEFAULT_SETTINGS.levels.A;
    return Math.round(meters / 100 * lv.pace_per_100_sec / 60);
  }

  // ---------- Datumi ----------
  function toDate(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
  function iso(d) { return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((toDate(b) - toDate(a)) / 86400000); }
  function addDays(isoDate, n) { const d = toDate(isoDate); d.setUTCDate(d.getUTCDate() + n); return iso(d); }
  function weekday(isoDate) { const w = toDate(isoDate).getUTCDay(); return w === 0 ? 7 : w; }

  // Nivo, po katerem se vodi zgodovina (A+B -> A).
  function historyLevel(levels) { return levels.includes('C') && !levels.includes('A') ? 'C' : 'A'; }

  // ---------- Knjižnica iz uvoženih treningov ----------
  function libraryFromTrainings(trainings, dict) {
    const map = new Map();
    const history = [];
    for (const t of trainings) {
      const hl = historyLevel(t.levels);
      for (const it of t.items) {
        const fp = fingerprint(it.text);
        if (LIBRARY_PHASES.includes(it.phase)) {
          const key = it.phase + '|' + fp;
          if (!map.has(key)) {
            const parsed = parseText(it.text, dict);
            map.set(key, {
              id: 'zvezek:' + key, source: 'zvezek', phase: it.phase, text: it.text,
              meters: parsed.meters, fingerprint: fp, levels: [], main_type: it.main_type || null
            });
          }
          const s = map.get(key);
          t.levels.forEach(l => { if (!s.levels.includes(l)) s.levels.push(l); });
          if (it.main_type && !s.main_type) s.main_type = it.main_type;
        }
        history.push({ date: t.date, level: hl, phase: it.phase, fingerprint: fp, main_type: it.main_type || null });
      }
    }
    return { sets: Array.from(map.values()), history };
  }

  // ---------- Generator ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function lastUseDays(history, fp, level, phase, date) {
    let best = null;
    for (const h of history) {
      if (h.fingerprint !== fp || h.level !== level || (phase && h.phase !== phase)) continue;
      const d = Math.abs(daysBetween(h.date, date));
      if (best === null || d < best) best = d;
    }
    return best;
  }

  function lastSprintDays(history, level, date) {
    let best = null;
    for (const h of history) {
      if (h.level !== level || h.phase !== 'glavna' || h.main_type !== 'sprint') continue;
      const d = daysBetween(h.date, date);
      if (d < 0) continue;
      if (best === null || d < best) best = d;
    }
    return best;
  }

  function weightedPick(items, weightFn, rng, exclude) {
    const pool = items.filter(x => !(exclude && exclude.has(x)));
    if (!pool.length) return null;
    const ws = pool.map(weightFn);
    const total = ws.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  }

  function mainAvailability(set, history, level, date, settings) {
    const d = lastUseDays(history, set.fingerprint, level, 'glavna', date);
    const repeat = settings.main_repeat_days;
    return { ok: d === null || d >= repeat, lastDays: d };
  }

  /**
   * Predlog enega treninga.
   * opts: { date, levels, library, history, settings, seed, orderVariant }
   */
  function generateTraining(opts) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, opts.settings || {});
    settings.levels = Object.assign({}, DEFAULT_SETTINGS.levels, (opts.settings || {}).levels || {});
    const levels = opts.levels;
    const lk = historyLevel(levels);
    const lv = settings.levels[lk];
    const date = opts.date;
    const history = opts.history || [];
    const rng = mulberry32(opts.seed != null ? opts.seed : Date.now() % 2147483647);
    const notes = [];

    const lib = (opts.library || []).filter(s => s.active !== false && (s.levels || []).includes(lk));
    const byPhase = p => lib.filter(s => s.phase === p);

    let mains = byPhase('glavna').filter(s => mainAvailability(s, history, lk, date, settings).ok);
    const sprintDays = lastSprintDays(history, lk, date);
    const sprintMains = mains.filter(s => s.main_type === 'sprint');
    const mode = opts.mainMode || 'auto';
    if (mode === 'ne_sprint') {
      mains = mains.filter(s => s.main_type !== 'sprint');
    } else if (mode === 'sprint') {
      mains = sprintMains;
      if (!mains.length) notes.push('Ni šprinterske glavne serije, ki ne bi bila uporabljena v zadnjih ' + settings.main_repeat_days + ' dneh.');
    } else if (sprintDays !== null && sprintDays < settings.sprint_min_gap_days) {
      mains = mains.filter(s => s.main_type !== 'sprint');
    } else if ((sprintDays === null || sprintDays >= settings.sprint_force_days) && sprintMains.length) {
      mains = sprintMains;
      notes.push(`Šprint: zadnji pred ${sprintDays === null ? 'več kot ' + settings.sprint_force_days : sprintDays} dnevi, zato je glavna serija šprinterska.`);
    }
    if (!mains.length) notes.push('V knjižnici ni glavne serije, ki ne bi bila uporabljena v zadnjih ' + settings.main_repeat_days + ' dneh.');

    const recencyWeight = (s) => {
      const d = lastUseDays(history, s.fingerprint, lk, s.phase, date);
      return d === null ? 40 : Math.min(d, 60) + 1;
    };

    const ogr = byPhase('ogrevalna');
    const vaje = byPhase('vaje');
    const zak = byPhase('zakljucek');
    const mid = (lv.meters_min + lv.meters_max) / 2;
    const vajeRange = lk === 'C' ? [2, 4] : [2, 3];

    let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const main = mains.length ? weightedPick(mains, recencyWeight, rng) : null;
      const warm = ogr.length ? weightedPick(ogr, recencyWeight, rng) : null;
      const nV = vajeRange[0] + Math.floor(rng() * (vajeRange[1] - vajeRange[0] + 1));
      const chosen = new Set();
      const vs = [];
      for (let i = 0; i < nV; i++) {
        const v = weightedPick(vaje, recencyWeight, rng, chosen);
        if (!v) break;
        chosen.add(v); vs.push(v);
      }
      // Kratka glavna serija (npr. SIMULATOR) dobi stransko serijo v zaključku.
      const shortMain = main && main.meters < (lk === 'C' ? 300 : 600);
      const z = zak.length && rng() < (shortMain ? 0.85 : 0.35) ? weightedPick(zak, recencyWeight, rng) : null;
      const fin = rng() < 0.5 ? 50 : 100;
      const total = lv.warmup_m + (warm ? warm.meters : 0) + vs.reduce((a, v) => a + v.meters, 0) + 50 +
        (main ? main.meters : 0) + (z ? z.meters : 0) + fin;
      let score = Math.abs(total - mid) / 50;
      if (total < lv.meters_min) score += (lv.meters_min - total) / 10;
      if (total > lv.meters_max) score += (total - lv.meters_max) / 10;
      // Glavna serija naj nosi trening: vsaj ~30 % metrov in ne manj kot vse vaje skupaj.
      const vajeM = vs.reduce((a, v) => a + v.meters, 0);
      const block = main ? main.meters + (shortMain && z ? z.meters : 0) : 0;
      if (main && block < 0.3 * total) score += 6;
      if (main && vajeM > block) score += 4;
      vs.forEach(v => { const d = lastUseDays(history, v.fingerprint, lk, 'vaje', date); if (d !== null && d < 14) score += 3; });
      if (warm) { const d = lastUseDays(history, warm.fingerprint, lk, 'ogrevalna', date); if (d !== null && d < 14) score += 3; }
      score += rng() * 2;
      if (!best || score < best.score) best = { score, main, warm, vs, z, fin, total };
    }

    let order = opts.orderVariant;
    if (!order) {
      const wd = weekday(date);
      order = (settings.highlight_order_choice_weekdays || []).includes(wd) && rng() < 0.5 ? 'glavna_takoj' : 'obicajni';
    }

    const mk = (phase, set, text) => {
      const t = text || set.text;
      return { phase, text: t, set_id: set && set.source === 'db' ? set.id : null, source: set ? set.source : 'fiksno', main_type: set ? set.main_type : null };
    };
    const items = { warm: [], vaje: [], main: [], zak: [] };
    if (best && best.warm) items.warm.push(mk('ogrevalna', best.warm));
    if (best) best.vs.forEach(v => items.vaje.push(mk('vaje', v)));
    if (best && best.main) items.main.push(mk('glavna', best.main));
    if (best && best.z) items.zak.push(mk('zakljucek', best.z));

    const list = [mk('razplavanje', null, `${lv.warmup_m} RAZP`)].concat(items.warm);
    if (order === 'glavna_takoj') {
      list.push(...items.main, mk('vmesno_razplavanje', null, '50 RAZP'), ...items.vaje);
    } else {
      list.push(...items.vaje, mk('vmesno_razplavanje', null, '50 RAZP'), ...items.main);
    }
    list.push(...items.zak, mk('zakljucno_razplavanje', null, `${best ? best.fin : 50} RAZP`));

    if (levels.includes('B')) {
      list.forEach(it => {
        if (it.phase === 'glavna') {
          const b = bVariant(it.text, settings);
          it.variantB = b.text;
          it.variantBNote = b.note;
        }
      });
    }
    return { date, levels, order_variant: order, items: list, notes };
  }

  function arrangeOrder(items, order) {
    const pick = p => items.filter(i => i.phase === p);
    const head = pick('razplavanje').concat(pick('ogrevalna'));
    const mid = order === 'glavna_takoj'
      ? pick('glavna').concat(pick('vmesno_razplavanje'), pick('vaje'))
      : pick('vaje').concat(pick('vmesno_razplavanje'), pick('glavna'));
    return head.concat(mid, pick('zakljucek'), pick('zakljucno_razplavanje'));
  }

  // Termini trenerja v tednu -> seznam {date, term_id, levels}.
  function weekSlots(mondayIso, terms, settings) {
    const s = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const slots = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(mondayIso, i);
      const wd = weekday(date);
      const groups = s.day_levels[wd] || s.day_levels[String(wd)];
      if (!groups) continue;
      const term = (terms || []).find(t => Number(t.day) === wd &&
        (!t.date_from || t.date_from <= date) && (!t.date_to || t.date_to >= date));
      if (!term) continue;
      groups.forEach(levels => slots.push({ date, term_id: term.id, term_label: term.label || term.id, levels: levels.slice() }));
    }
    return slots;
  }

  // Zgodovinski zapis iz predloga (za zaporedno sestavljanje tedna).
  function historyFromTraining(tr) {
    const lvl = historyLevel(tr.levels);
    return tr.items.map(it => ({ date: tr.date, level: lvl, phase: it.phase, fingerprint: fingerprint(it.text), main_type: it.main_type || null }));
  }

  return {
    PHASES, PHASE_LABELS, LIBRARY_PHASES, DEFAULT_SETTINGS, REVIEW_CODES,
    buildDict, parseLine, parseText, toStructure, normalizeText, fingerprint, bVariant,
    estimateMinutes, parseTime, formatTime, libraryFromTrainings, generateTraining, arrangeOrder,
    weekSlots, historyFromTraining, historyLevel, lastUseDays, addDays, daysBetween, weekday, mulberry32
  };
});
