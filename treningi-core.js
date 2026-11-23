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
    // Šprinterski trening: več kot toliko metrov max v celem treningu.
    sprint_max_meters: 150,
    // Vaje: ista vaja (ne glede na število ponovitev) se ne ponovi 3 tedne.
    vaje_repeat_days: 21,
    // Pogostost formatov pri vajah (privzeto 1): 6x50 je redkost, 10x25 in podobno pogosteje.
    vaje_format_weights: { '10x25': 3, '12x25': 2, '8x25': 1.5, '6x25': 1.5, '6x50': 0.15, '8x50': 0.15, '10x50': 0.3 },
    levels: {
      A: { meters_min: 2200, meters_max: 2500, warmup_m: 300, pace_per_100_sec: 85 },
      B: { meters_min: 2200, meters_max: 2500, warmup_m: 300, pace_per_100_sec: 85 },
      C: { meters_min: 1400, meters_max: 1700, warmup_m: 200, pace_per_100_sec: 120 }
    },
    b_variant: { reps_minus: 1, min_reps_to_reduce: 4 },
    highlight_order_choice_weekdays: [1],
    // Vaje, ki nikoli ne pridejo skupaj v istem treningu.
    exclusive_codes: [['ORKA', 'BIONDI']],
    // Te (skoraj enake) vaje naj bodo tudi med treningi vsaj toliko dni narazen.
    exclusive_gap_days: 28,
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
    ['BIONDI', 'delfin vaja, skoraj enaka kot ORKA; nikoli skupaj z ORKA', 'vaja'],
    ['RV', 'roka ven, 90° (npr. KN RV)', 'vaja'],
    ['PPDZ', 'RRU: ponavljaj prednji del zavesljaja', 'vaja'],
    ['ŠTETJE', 'štetje zavesljajev', 'vaja'],
    ['KR', 'kravl roke (DN KR = delfin noge, kravl roke)', 'vaja'],
    ['DR', 'delfin roke (KN DR = kravl noge, delfin roke)', 'vaja'],
    ['PR', 'prsno roke (PR DN = prsno roke, delfin noge)', 'vaja'],
    ['PZDZ', 'ponovi zadnji del zavesljaja', 'vaja'],
    ['BIEGNER', 'stegnjene roke', 'vaja'],
    ['BREZ VDIHA', 'poskusiš odplavati 50 m brez vdiha', 'drugo'],
    ['5+1', '5 tempo, 1 hitro', 'stopnjevanje'],
    ['6-3-6', '6 udarcev na boku, 3 zavesljaji, 6 udarcev na drugem boku', 'vaja'],
    ['3-1', 'H 3-1: trije udarci, 1 koordinacija', 'vaja'],
    ['OBRATNO', 'mešano v obratnem vrstnem redu (NORMALNO / OBRATNO); pri KZ dihanje kontra', 'drugo'],
    ['PRSTI', 'RRU: prsti po gladini vode', 'vaja'],
    ['SALTO NA POL', 'salto na pol bazena in nazaj v cilj hitro, ne nadaljuješ naprej', 'vaja'],
    ['ORKA', 'delfin noge s podvodnim delom zavesljaja', 'vaja'],
    ['ROTACIJA', 'rotacija ramenskega obroča', 'vaja'],
    ['SIMULATOR', '50 m + natanko 10 s + 50 m, simuliran čas tekme', 'vaja'],
    ['PACMAN', 'z lopatkami, lopatka na dnu', 'vaja'],
    ['ZADNJIH 7 DN', 'zadnjih 7 m pod vodo, v cilj z delfin nogami', 'vaja'],
    ['METULJČEK', 'metuljček, pomožna tehnika med delfinom in prsnim', 'vaja'],
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
  const FILLER = new Set(('SALTO POL FREK VEN ZADNJIH METULJČEK LEVA DESNA VDIH NAPREJ Z NA PO POD ČIM DLJE DALJŠI VIŠJI VODO BREZ DIHANJA DIHANJE VDIHA VSAK VSAKIČ ROKA ROKE UZ ZAVES ' +
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
      if (/^\d+\.?$/.test(t) || /^\d+[x×]$/i.test(t) || /^\d+°$/.test(t) || /^\d+[sm]$/.test(t)) continue;
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

  // ---------- Metri max (šprint) ----------
  const isMaxText = t => /![^A-Z]*|\bMAX\b|\bSIMULATOR\b/i.test(String(t || '').replace(/MAX\s+(OBRAT|FREK)/gi, ''));

  function maxMetersLine(line) {
    const s = cleanQuotes(line).trim();
    let m;
    if ((m = s.match(/^(\d+)\s*[xX]\s*\((.*)\)(.*)$/))) {
      const inner = m[2].split(/\s+\/\s+/);
      return +m[1] * inner.reduce((a, p) => a + maxMetersLine(p), 0);
    }
    let reps = 1, dist = 0, rest = s;
    if ((m = s.match(/^(\d+)\s*[xX]\s*(\d+)(?![\d'"])(.*)$/))) { reps = +m[1]; dist = +m[2]; rest = m[3]; }
    else if ((m = s.match(/^(\d+)(?![\d'"xX])(.*)$/))) {
      const segs = s.split(/\s*[+,]\s*/);
      if (segs.length > 1 && segs.every(x => /^\d+(\s|$)/.test(x))) return segs.reduce((a, x) => a + (isMaxText(x) ? parseInt(x, 10) : 0), 0);
      dist = +m[1]; rest = m[2];
    } else return 0;
    const total = reps * dist;
    if (/\b4-3-2-1\b/.test(rest)) return Math.round(total / 10); // 4 POČ, 3 T, 2 HIT, 1 Max
    if (!isMaxText(rest)) return 0;
    if (/↑/.test(rest) && /↓/.test(rest)) {
      const parts = rest.match(/[↑↓][^↑↓]*/g) || [];
      return total * parts.filter(isMaxText).length / parts.length;
    }
    const alt = rest.match(/\d+\s*x\s*[^\d\s][^]*?(?=\s\d+\s*x\s*[^\d\s]|$)/gi);
    if (alt && alt.length > 1) {
      const n = alt.map(a => parseInt(a, 10));
      const sum = n.reduce((a, b) => a + b, 0);
      return Math.round(total * alt.reduce((a, t, i) => a + (isMaxText(t) ? n[i] : 0), 0) / sum);
    }
    const segs = rest.split('+').map(x => x.match(/(\d+)(!|\s*$|\s+(?![\d@])[^]*|\s+@[^]*)/)).filter(Boolean);
    if (segs.length > 1) return reps * segs.reduce((a, x) => a + (isMaxText(x[2]) ? +x[1] : 0), 0);
    return total;
  }
  /** Koliko metrov v besedilu je max (K!, MAX, SIMULATOR; MAX OBRAT se ne šteje). */
  function maxMeters(text) {
    return cleanQuotes(text).split(/\n/).reduce((a, l) => a + maxMetersLine(l), 0);
  }
  function isSprintTexts(texts, settings) {
    const limit = (settings && settings.sprint_max_meters) || DEFAULT_SETTINGS.sprint_max_meters;
    return texts.reduce((a, t) => a + maxMeters(t), 0) > limit;
  }
  function isSprintMain(set, settings) { return set.main_type === 'sprint' || isSprintTexts([set.text], settings); }

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
    })).map((line, i) => {
      const orig = cleanQuotes(text).split(/\n/)[i];
      const reps = parseInt(orig, 10);
      const alt = orig.match(/\s1x\s[^]*?(?=\s1x\s|$)/g);
      // Vsaka ponovitev ima svojo različico: ko ponovitev odpade, odpade tudi zadnja različica.
      return line !== orig && alt && alt.length === reps && cfg.reps_minus === 1 ? line.slice(0, line.length - alt[alt.length - 1].length) : line;
    }).join('\n');
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
      const sprint = isSprintTexts(t.items.map(i => i.text));
      for (const it of t.items) {
        const fp = fingerprint(it.text);
        // Negotovo prebrane vrstice štejejo v zgodovino, ne pa v predloge.
        if (LIBRARY_PHASES.includes(it.phase) && !it.incomplete) {
          const key = it.phase + '|' + fp;
          if (!map.has(key)) {
            const parsed = parseText(it.text, dict);
            map.set(key, {
              id: 'zvezek:' + key, source: 'zvezek', phase: it.phase, text: it.text,
              meters: parsed.meters, fingerprint: fp, levels: [], main_type: it.phase === 'glavna' && isSprintTexts([it.text]) ? 'sprint' : null
            });
          }
          const s = map.get(key);
          t.levels.forEach(l => { if (!s.levels.includes(l)) s.levels.push(l); });
        }
        history.push({ date: t.date, level: hl, phase: it.phase, fingerprint: fp, main_type: it.phase === 'glavna' && sprint ? 'sprint' : null });
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

  // Vsebina vaje brez števila ponovitev in razdalje: "8X25 PL KN" in "10X25 PL KN" sta ista vaja.
  function drillKey(fp) {
    return String(fp || '').split('\n').map(l => l.replace(/^\d+X\s*\d+\s*/, '').trim()).join('\n');
  }
  function setFormat(text) {
    const m = String(text || '').match(/^\s*(\d+)\s*[xX]\s*(\d+)(?![\d'"])/);
    return m ? m[1] + 'x' + m[2] : 'drugo';
  }
  function lastDrillDays(history, fp, level, date) {
    const key = drillKey(fp);
    let best = null;
    for (const h of history) {
      if (h.level !== level || h.phase !== 'vaje' || drillKey(h.fingerprint) !== key) continue;
      const d = Math.abs(daysBetween(h.date, date));
      if (best === null || d < best) best = d;
    }
    return best;
  }
  /** Vaje, ki na ta dan niso blokirane s pravilom 3 tednov. */
  function availableDrills(sets, history, level, date, settings) {
    return sets.filter(s => {
      const d = lastDrillDays(history, s.fingerprint, level, date);
      return (d === null || d >= settings.vaje_repeat_days) && !exclusiveTooSoon(s.text, history, level, date, settings);
    });
  }
  function drillWeight(set, history, level, date, settings) {
    const d = lastDrillDays(history, set.fingerprint, level, date);
    const w = (settings.vaje_format_weights || {})[setFormat(set.text)];
    return (d === null ? 40 : Math.min(d, 60) + 1) * (w == null ? 1 : w);
  }

  function hasWord(text, word) {
    return String(text || '').toUpperCase().split(/[^A-ZČŠŽĆĐ0-9°]+/).includes(word);
  }
  /** Ali bi dodano besedilo v istem treningu združilo vaji, ki se izključujeta (npr. ORKA in BIONDI). */
  function exclusiveConflict(text, others, settings) {
    const groups = (settings && settings.exclusive_codes) || DEFAULT_SETTINGS.exclusive_codes;
    const all = (others || []).concat([text]);
    return groups.some(g => g.some(w => hasWord(text, w)) && g.filter(w => all.some(t => hasWord(t, w))).length > 1);
  }

  /** Koliko dni je od zadnje vaje iz iste skupine (ORKA/BIONDI); null, če besedilo take vaje nima ali je še ni bilo. */
  function lastExclusiveDays(text, history, level, date, settings) {
    const groups = (settings && settings.exclusive_codes) || DEFAULT_SETTINGS.exclusive_codes;
    const words = [].concat(...groups.filter(g => g.some(w => hasWord(text, w))));
    if (!words.length) return null;
    let best = null;
    (history || []).forEach(h => {
      if (h.level !== level || !words.some(w => hasWord(h.fingerprint, w))) return;
      const d = Math.abs(daysBetween(h.date, date));
      if (best === null || d < best) best = d;
    });
    return best;
  }
  function exclusiveTooSoon(text, history, level, date, settings) {
    const d = lastExclusiveDays(text, history, level, date, settings);
    return d !== null && d < ((settings && settings.exclusive_gap_days) || DEFAULT_SETTINGS.exclusive_gap_days);
  }

  // ---------- Nove serije ----------
  // Dva vira: (1) križanje delov serij, ki jih trener že ima v knjižnici (slog se uči sproti z vsakim uvozom),
  // (2) ideje v njegovem slogu iz potrjenih kratic. Vedno čakajo na pregled.
  const NEW_PARTS = {
    A: {
      noge: [['K', 'KN'], ['K', 'KN BOK'], ['K', 'KN SUPERMAN'], ['K', 'KN RV'], ['D', 'DN'], ['D', 'DN BOK'], ['D', 'DN H'], ['H', 'HN'], ['H', 'HN ROTACIJA'], ['H', 'HN RV']],
      vaje: [['K', 'KV 2-2'], ['K', 'K RRU PESTI'], ['K', 'K RRU PALEC'], ['K', 'K RRU ZADRGA'], ['K', 'K RRU ŠPRICANJE'], ['K', 'K RRU RINEŠ'], ['K', 'K RRU PPDZ'], ['K', 'K RRU PRSTI'], ['K', 'K 6-3-6'],
        ['K', 'K SHARK 1'], ['K', 'K SHARK 2'], ['K', 'K SHARK 3'], ['K', 'K VISOK KOMOLEC'], ['K', 'VATERPOLO'], ['K', 'KZ'], ['K', 'K BIEGNER'],
        ['D', 'DV 1-1-2'], ['D', 'DV 2-2-2'], ['D', 'DV 3-3'], ['D', 'DV ORKA'], ['D', 'DV BIONDI'], ['D', 'DV 6-1'], ['D', 'D DIH NA 1'], ['D', 'DN KR'],
        ['H', 'HV RRU 90°'], ['H', 'HV ROKA VEN ZAVES'], ['H', 'H 6-1'], ['H', 'H 3-1'], ['H', 'HV HITLER']]
    },
    C: {
      noge: [['K', 'KN'], ['K', 'KN BOK'], ['K', 'KN SUPERMAN'], ['K', 'KN RV'], ['H', 'HN'], ['H', 'HN ROTACIJA'], ['H', 'HN 90°']],
      vaje: [['K', 'KV 2-2'], ['K', 'K RRU'], ['K', 'K RRU PESTI'], ['K', 'K RRU PALEC'], ['K', 'K RRU ZADRGA'], ['K', 'K 6-3-6'], ['K', 'KZ'],
        ['H', 'HV RRU'], ['H', 'HV RRU 90°'], ['H', 'H 6-1'], ['H', 'HV ROKA VEN ZAVES']]
    }
  };
  const CELA = { K: 'K CT', H: 'H CT', D: 'D CT' };
  const UNDERWATER = ['DN PV', 'DN H', 'KN PV', 'DN BOK'];

  // Polovice ↑…/↓… iz knjižnice, ločeno po razdalji in plavutkah.
  function libraryHalves(library, lk) {
    const out = {};
    (library || []).forEach(s => {
      if (s.phase !== 'vaje' || !(s.levels || []).includes(lk)) return;
      const m = s.text.match(/^\d+x(25|50)( PL)? ↑([^↑↓\n]+) ↓([^↑↓\n]+)$/);
      if (!m || /!|MAX|RAZP|VSAK/.test(s.text)) return;
      const k = m[1] + (m[2] || '');
      (out[k] = out[k] || { up: [], down: [] });
      out[k].up.push(m[3].trim()); out[k].down.push(m[4].trim());
    });
    return out;
  }

  function newDrill(lk, rng, opts) {
    const P = NEW_PARTS[lk];
    const one = a => a[Math.floor(rng() * a.length)];
    const halves = libraryHalves(opts && opts.library, lk);
    const keys = Object.keys(halves).filter(k => halves[k].up.length > 2);
    if (keys.length && rng() < 0.35) {
      const k = one(keys), h = halves[k];
      const up = one(h.up), down = one(h.down);
      if (up !== down) {
        const fifty = k.startsWith('50');
        return `${fifty ? 4 : lk === 'C' ? one([8, 8, 6]) : one([10, 8, 10])}x${fifty ? 50 : 25}${k.slice(2)} ↑${up} ↓${down}`;
      }
    }
    const v1 = one(P.vaje);
    const same = P.vaje.filter(x => x[0] === v1[0] && x[1] !== v1[1]);
    const other = P.vaje.filter(x => x[0] !== v1[0]);
    const n = one(P.noge.filter(x => x[0] === v1[0]));
    const rru = P.vaje.filter(x => /RRU|SHARK/.test(x[1]) && x[0] === 'K');
    if (lk === 'C') {
      return one([
        () => `${one([8, 8, 6])}x25 PL ↑${n[1]} ↓${v1[1]}`,
        () => `8x25 PL 4x ${v1[1]} 4x ${one(same)[1]}`,
        () => `8x25 PL 3x ${v1[1]} 1x ${CELA[v1[0]]}`,
        () => `8x25 PL ${one(['KN', 'HN', 'KN BOK'])} + PREVAL`,
        () => `${one([6, 8])}x25 ↑${one(['PD 3s', 'PV 1-2', 'PV 1-3'])} ↓${one(['P', 'H', 'PV 1-2'])}`,
        () => `8x25 P ↑ČIM DLJE POD VODO ↓${one(['1-2', '1-3', 'KRAJŠANJE'])}`,
        () => `8x25 ↑PPV ↓${one(['GERMANJA', 'H', 'PD 3s'])}`,
        () => `4x50 PL ↑${n[1]} ↓${v1[1]}`,
        () => `4x75 PL 25 ${n[1]} + 25 ${v1[1]} + 25 ${CELA[v1[0]]}`,
        () => `8x25 PL ↑DN H ↓${one(['K 6-3-6', 'KV 2-2', 'K RRU'])}`
      ])();
    }
    const dStroke = P.vaje.filter(x => x[0] === 'D'), hStroke = P.vaje.filter(x => x[0] === 'H'), kStroke = P.vaje.filter(x => x[0] === 'K');
    return one([
      () => `${one([10, 10, 8])}x25 PL ↑${n[1]} ↓${v1[1]}`,
      () => `${one([10, 8])}x25 PL ↑${v1[1]} ↓${one(other)[1]}`,
      () => `${one([10, 8])}x25 PL ↑${one(UNDERWATER)} ↓${one(kStroke.concat(hStroke))[1]}`,
      () => `12x25 PL 4x ${v1[1]} 4x ${one(same)[1]} 4x ${CELA[v1[0]]}`,
      () => `${one([8, 12])}x25 PL 3x ${v1[1]} 1x ${CELA[v1[0]]}`,
      () => `12x25 PL 3x ${one(['DN PV', 'KN PV', 'DN H PV'])} 1x ${one(['H', 'K'])} VSAKIČ DLJE`,
      () => `8x25 PL ${one(['H', 'D DIH NA 1', 'K BD', 'K VISOK KOMOLEC'])} ZADNJIH 7 DN`,
      () => `4x75 PL 25 ${n[1]} + 25 ${v1[1]} + 25 ${CELA[v1[0]]}`,
      () => `4x75 PL 25 ${one(dStroke)[1]} + 25 ${one(hStroke)[1]} + 25 ${one(kStroke)[1]}`,
      () => `10x25 PL ↑${one(['KN DR', 'DN KR', 'PR DN'])} ↓${one(['K CT', 'D CT', 'K BD', 'H CT'])}`,
      () => `8x25 ↑${one(['POPAJ', 'SCULLING'])} ↓K ČMZ`,
      () => `4x50 PL ↑${one(rru)[1]} ↓${one(rru)[1]}`,
      () => `4x50 PL ${v1[1]} + MAX OBRAT`,
      () => `${one([8, 10])}x25 PL ↑${v1[1]} ↓${v1[0] === 'D' ? 'D' : 'K'} DIH NA ${one([3, 5])}`,
      () => `4x50 PL ↑${n[1]} ↓${v1[1]}`
    ])();
  }

  function newWarmup(lk, rng) {
    const one = a => a[Math.floor(rng() * a.length)];
    const A = [
      () => `${one([4, 6])}x75 ${one(['MBK', 'MBD', 'MBP', 'K', 'H'])} ${one(['N/V/CT', 'V/N/CT', 'CT/N/CT', 'N/CT/V'])}`,
      () => `${one([4, 6])}x75 1x ${one(['MBK', 'MBD', 'MBP'])} 1x K DIH ${one(['3-5-7', '3-4-5', '5-3-5'])}`,
      () => `4x100 ${one(['M', 'M Z ZAMIKOM'])} ${one(['N/CT/V/CT', 'V/CT/N/CT', 'CT/V/N/CT'])}`,
      () => `4x100 M PO 25 ${one(['V/CT', 'N/V', 'CT/V'])}`,
      () => `4x100 PL 25 ${one(['D', 'M', 'DN PV'])} + 75 ${one(['H/K', 'K N/V/CT', 'H N/V/CT'])}`,
      () => `16x25 M ${one(['1xV 1xCT', '2xN 2xCT', '4xN 4xCT 4xV 4xCT', '4xV 4xN 4xCT 4xČMZ', 'PO 4 ↑V ↓CT', '3xCT 1xN'])}${one(['', ' p10"', ' p5"'])}`,
      () => `8x50 MM ↑${one(['N', 'V'])} ↓CT`,
      () => `8x50 ${one(['KV 1x RRU PALEC 1x ČMZ', '1x K ČMZ 1x H V', 'KV 1x 2-2 1x ČMZ', 'MM 2xN 2xV 4xCT', 'M 2xV 2xCT 2xN 2xCT'])}`,
      () => `${one([6, 8])}x50 ↑${one(['N', 'V'])} ↓CT ${one(['K/H', 'K/D', 'H/P', 'P/K'])}`,
      () => `6x50 ↑${one(['K', 'H'])} ↓${one(['D/H/P', 'P/D/H', 'H/P/D'])}`,
      () => `3x150 PL ${one(['H N/V/CT', 'K V/N/CT', 'K DIH 3-5-7'])}`,
      () => one(['100 K + 75 P + 50 H + 25 D + 50 H + 75 P', '25 D + 50 H + 75 P + 100 K + 50 H + 75 P', '50 K + 100 M + 150 K + 100 M', '25 DV + 50 HV + 75 PV + 100 KV + 50 H + 25 D', '100 M + 75 MBK + 50 H + 25 D + 50 K + 75 P'])
    ];
    const C = [
      () => `4x75 ${one(['H/K/P', 'K/P/H', 'P/H/K'])} CT`,
      () => `${one([4, 6])}x50 ↑${one(['KN', 'HN', 'PN'])} ↓${one(['K', 'H', 'P'])} CT`,
      () => `${one([4, 6])}x50 ↑${one(['PD 3s', 'PD 5s', 'PV 1-2', 'PV 1-3'])} ↓${one(['K', 'H', 'H/K'])}`,
      () => `6x50 ↑${one(['K', 'H'])} ↓${one(['P/H/GERMANJA', 'K/P/GERMANJA'])}`,
      () => `8x25 ${one(['1xK 1xH', '1xP 1xK', '2xH 2xP'])} p10"`,
      () => `4x75 25 P 1-2 + 25 PD 3s + 25 ${one(['P', 'H', 'K'])}`,
      () => `4x50 DESKA ${one(['P/H', 'K/H', 'H/P'])}`,
      () => one(['25 K + 50 H + 75 P + 50 H + 25 K', '50 K + 75 P + 50 H + 25 K', '25 P + 50 K + 75 H + 50 K + 25 P', '50 H + 50 P + 100 K + 50 P'])
    ];
    return one(lk === 'C' ? C : A)();
  }

  // Zamenja eno ali dve vrstici glavne serije iz knjižnice z vrstico druge glavne, ki ima enako metrov.
  function mixMain(library, lk, rng) {
    const one = a => a[Math.floor(rng() * a.length)];
    const sets = (library || []).filter(s => s.phase === 'glavna' && (s.levels || []).includes(lk) && s.text.split('\n').length >= 3);
    if (sets.length < 4) return null;
    const base = one(sets);
    const lines = base.text.split('\n');
    const pool = [];
    sets.forEach(s => { if (s !== base) s.text.split('\n').forEach(l => { if (/@|p\d/.test(l)) pool.push(l); }); });
    const m = l => parseLine(l, new Map()).meters;
    const n = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
      const k = Math.floor(rng() * lines.length);
      const cand = pool.filter(l => m(l) === m(lines[k]) && !lines.includes(l));
      if (!cand.length) return null;
      lines[k] = one(cand);
    }
    return lines.join('\n');
  }

  function newMain(lk, rng, opts) {
    const one = a => a[Math.floor(rng() * a.length)];
    const pick = (a, n) => { const c = a.slice(), r = []; while (r.length < n && c.length) r.push(c.splice(Math.floor(rng() * c.length), 1)[0]); return r; };
    const uniq = a => a.filter((x, i) => a.indexOf(x) === i).join('\n');
    const sprint = !!(opts && opts.sprint);
    if (lk === 'C') {
      const s = () => one(['K', 'H', 'P']);
      return one([
        () => `${one([6, 8])}x50 ↑${s()} HITRO ↓RAZP`,
        () => `4x75 50 ${s()} + 25 ${one(['K', 'H'])}`,
        () => `${one([3, 4])}x100 ${one(['50 P + 50 K', '50 H + 50 K', '75 K + 25 H', '75 P + 25 H', '25 H + 50 P + 25 K'])}`,
        () => `16x25 p15" ${one(['3xK 1xP', '3xH 1xP', '2xP 2xK', '1xK 1xH 1xP 1xK'])}`,
        () => one(['100 K + 75 P + 50 H + 25 K + 50 H + 75 P', '50 K + 100 P + 150 K + 50 H', '200 K + 100 P + 50 H', '25 K + 50 P + 75 H + 100 K + 75 P']),
        () => `3x( 50 ${s()} @1'15" / 50 ${s()} @1'15" / 25 K + 25 RAZP )`,
        () => `2x150 1x ${one(['P', 'K'])} 1x ${one(['H/P/K', 'K/H/P'])}`,
        () => `6x50 STIL p15"`,
        () => `4x50 PL KN ZD p15"\n4x50 PL ${one(['K RRU PALEC', 'H CT', 'KV 2-2'])}`
      ])();
    }
    // Štarti so samo taki, ki jih trener za te razdalje že uporablja.
    const base = [`4x100 KVL @2'`, `3x100 KVL @2'`, `6x50 KVL @1'`, `4x75 KVL @1'30"`, `2x200 VL @3'30"`, `3x100 VL DOLGO @2'`];
    const tempo = [`4x50 K 3+1 @1'`, `8x50 K 3+1 @1'`, `6x50 K 5+1 @1'`, `4x50 K 1-4 @1'`, `3x100 K T @1'50"`, `6x50 K 2+1 @1'`, `4x75 STOP PO 25 @1'30"`, `4x50 K @50"`, `4x75 @1'15"`];
    const mix = [`3x100 M @2'`, `2x100 M @2'`, `4x50 MBK @1'`, `4x75 MBK @1'30"`, `4x50 25 D + 25 K @1'`, `4x75 50 K + 25 D @1'30"`, `4x50 KN @1'20"`, `6x25 NOGE @35"`, `2x100 PL NOGE @2'`];
    const fast = [`6x50 25 K! + 25 RAZP @1'`, `8x50 ↑K! ↓RAZP @1'`, `8x50 ↑STIL! ↓RAZP @1'`, `4x50 25 D! + 25 RAZP @1'`, `4x( 50 K T @1' / 25 K! / 25 RAZP )`, `6x50 25 K! BD + 25 RAZP @1'`, `8x25 1x K! 1x RAZP p30"`, `3x( 4x50 ↑K! ↓RAZP p30" )`];
    const theme50 = ['VL', 'K', 'MAD', 'K VSAK 3. D', 'MBK', 'K STOP', 'K 2+1', 'K DIH 5-7', 'K ČMZ'];
    const theme100 = ['VL', '75 K + 25 N', 'K T', 'M', '50 H + 50 K', 'K 2+1', 'NORMALNO', '50 HITRO + 50 POČASI'];
    if (sprint) {
      return one([
        () => uniq([one(base), one(fast), rng() < 0.5 ? one(tempo) : one(fast)]),
        () => uniq([`3x( 100 SIMULATOR / 50 RAZP )`, one([`6x50 KVL @1'`, `4x100 KVL @2'`, `4x50 MBK @1'`])]),
        () => `${one([4, 5])}x( 100 K T @2' / 25 ${one(['K!', 'D!', 'STIL!'])} / 25 RAZP )\n${one(fast)}`,
        () => uniq([one(fast), one([`4x50 KVL @1'`, `4x50 MBK @1'`]), one(fast)])
      ])();
    }
    return one([
      () => mixMain(opts && opts.library, lk, rng) || uniq([one(base), one(tempo), one(mix)]),
      () => mixMain(opts && opts.library, lk, rng) || uniq([one(tempo), one(base), one(mix)]),
      () => uniq([one(base), one(tempo), one(mix)].concat(rng() < 0.4 ? [one(tempo)] : [])),
      () => `3x( ${one([5, 6])}x50 @1' ) ${pick(theme50, 3).map(t => '1x ' + t).join(' ')}`,
      () => `3x( ${one([3, 4])}x100 @2' ) ${pick(theme100, 3).map(t => '1x ' + t).join(' ')}`,
      () => `${one([3, 4])}x( ${one([`150 VL @3'`, `100 KVL @2'`, `75 K T @1'30"`])} / ${one([`100 T @2'`, `50 K T @1'`])} / ${one([`50 HITRO @1'`, `50 M @1'`, `50 KN @1'20"`])} / ${one(['25 D + 25 RAZP', '50 RAZP'])} )`,
      () => { const a = one(['K', 'VL']), b = one(['M', 'MBK', 'H', 'D/K']); return `3x( 100 ${a} @2' / 50 ${b} @1' )\n50 RAZP\n3x( 50 ${b} @1' / 100 ${a} @2' )`; },
      () => `4x50 ${one(['K', 'KVL'])} @1'05"\n4x50 KN @1'20"\n4x50 K @1'\n4x50 KN @1'15"\n4x50 K @55"`,
      () => `3x100 ${one(['VL', 'KVL'])} @2'\n3x50 ${one(['T', 'MBK', 'K 2+1'])} @1'\n2x100 ${one(['M', 'K T'])} @2'\n2x50 ${one(['D', 'H', 'KN'])} @1'\n100 ${one(['K HITRO', 'STIL'])} @2'\n50 ${one(['D', 'K HITRO'])} @1'`,
      () => `200 ${one(['VL', 'K'])} @3'30"\n100 ${one(['M', 'K T'])} @2'\n4x50 ${one(['K 3+1', 'MBK', 'K STOP'])} @1'\n100 ${one(['M', 'K T'])} @2'\n200 ${one(['VL', 'K'])} @3'30"`
    ])();
  }

  /** Predlog nove serije za fazo; null, če ustrezne ni. */
  function suggestNewSet(phase, opts) {
    const { level, library, history, dict } = opts;
    const settings = Object.assign({}, DEFAULT_SETTINGS, opts.settings || {});
    const rng = opts.rng || Math.random;
    const key = phase === 'vaje' ? drillKey : (f => f);
    const known = new Set((library || []).filter(s => s.phase === phase).map(s => key(s.fingerprint)));
    (history || []).forEach(h => { if (h.phase === phase) known.add(key(h.fingerprint)); });
    (opts.exclude || []).forEach(f => known.add(key(f)));
    const limits = {
      ogrevalna: level === 'C' ? [200, 300] : [300, 450],
      vaje: [150, 300],
      glavna: level === 'C' ? [300, 450] : [700, 1250]
    }[phase];
    if (!limits) return null;
    const make = { vaje: newDrill, ogrevalna: newWarmup, glavna: newMain }[phase];
    for (let i = 0; i < 120; i++) {
      const text = make(level, rng, { sprint: opts.sprint, library });
      const fp = fingerprint(text);
      if (known.has(key(fp))) continue;
      // Ista vaja na obeh straneh (↑X ↓X, 1x X 1x X) ni smiselna.
      const halves = text.match(/[↑↓][^↑↓]+/g);
      if (halves && halves.length === 2 && halves[0].slice(1).trim() === halves[1].slice(1).trim()) continue;
      if (exclusiveConflict(text, opts.others, settings)) continue;
      if (opts.date && exclusiveTooSoon(text, history, level, opts.date, settings)) continue;
      if (phase === 'glavna' && isSprintTexts([text], settings) !== !!opts.sprint) continue;
      const meters = parseText(text, dict).meters;
      if (meters < limits[0] || meters > limits[1]) continue;
      return { phase, text, meters, fingerprint: fp, levels: [level], source: 'nova', isNew: true, main_type: phase === 'glavna' && opts.sprint ? 'sprint' : null };
    }
    return null;
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
    const sprintMains = mains.filter(s => isSprintMain(s, settings));
    const mode = opts.mainMode || 'auto';
    if (mode === 'ne_sprint') {
      mains = mains.filter(s => !isSprintMain(s, settings));
    } else if (mode === 'sprint') {
      mains = sprintMains;
      if (!mains.length) notes.push('Ni šprinterske glavne serije, ki ne bi bila uporabljena v zadnjih ' + settings.main_repeat_days + ' dneh.');
    } else if (sprintDays !== null && sprintDays < settings.sprint_min_gap_days) {
      mains = mains.filter(s => !isSprintMain(s, settings));
    } else if ((sprintDays === null || sprintDays >= settings.sprint_force_days) && sprintMains.length) {
      mains = sprintMains;
      notes.push(`Šprint: zadnji pred ${sprintDays === null ? 'več kot ' + settings.sprint_force_days : sprintDays} dnevi, zato je glavna serija šprinterska.`);
    }
    if (!mains.length) notes.push('V knjižnici ni glavne serije, ki ne bi bila uporabljena v zadnjih ' + settings.main_repeat_days + ' dneh.');

    // Uteži se izračunajo enkrat na serijo (zgodovina je dolga, poskusov je 400).
    const memo = fn => { const m = new Map(); return s => { if (!m.has(s)) m.set(s, fn(s)); return m.get(s); }; };
    const recencyWeight = memo((s) => {
      const d = lastUseDays(history, s.fingerprint, lk, s.phase, date);
      return d === null ? 40 : Math.min(d, 60) + 1;
    });

    const ogr = byPhase('ogrevalna');
    const allDrills = byPhase('vaje');
    let vaje = availableDrills(allDrills, history, lk, date, settings);
    if (vaje.length < 4 && allDrills.length) {
      notes.push('Premalo vaj, ki ne bi bile uporabljene v zadnjih ' + settings.vaje_repeat_days + ' dneh; dodaj nove v knjižnico.');
      vaje = allDrills.filter(v => !exclusiveTooSoon(v.text, history, lk, date, settings));
    }
    const zak = byPhase('zakljucek');
    const mid = (lv.meters_min + lv.meters_max) / 2;
    const vajeRange = lk === 'C' ? [2, 4] : [2, 3];
    const vajeWeight = memo(v => drillWeight(v, history, lk, date, settings));
    const maxM = memo(x => x ? maxMeters(x.text) : 0);
    const warmDays = memo(w => lastUseDays(history, w.fingerprint, lk, 'ogrevalna', date));

    // Nove serije: opts.newSets = 'brez' | 'ena' | 'vse'. Izbrane so vnaprej, da se metri izidejo.
    const newMode = opts.newSets || 'brez';
    const wantSprint = mode === 'sprint' || (mains.length > 0 && mains.every(s => isSprintMain(s, settings)));
    const noSprint = mode === 'ne_sprint' || (mode === 'auto' && sprintDays !== null && sprintDays < settings.sprint_min_gap_days);
    const newPhases = newMode === 'vse' ? ['ogrevalna', 'vaje', 'glavna']
      : newMode === 'ena' ? [['ogrevalna', 'vaje', 'vaje', 'glavna'][Math.floor(rng() * 4)]] : [];
    const fresh = {};
    newPhases.forEach(p => {
      const n = suggestNewSet(p, { level: lk, library: opts.library, history, dict: opts.dict, rng, settings, date, others: Object.values(fresh).map(x => x.text), sprint: p === 'glavna' && wantSprint });
      if (n) fresh[p] = n;
    });

    let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const main = fresh.glavna || (mains.length ? weightedPick(mains, recencyWeight, rng) : null);
      const warm = fresh.ogrevalna || (ogr.length ? weightedPick(ogr, recencyWeight, rng) : null);
      const nV = vajeRange[0] + Math.floor(rng() * (vajeRange[1] - vajeRange[0] + 1));
      const chosen = new Set();
      const vs = fresh.vaje ? [fresh.vaje] : [];
      const keys = new Set(vs.map(v => drillKey(v.fingerprint)));
      while (vs.length < nV) {
        const v = weightedPick(vaje, vajeWeight, rng, chosen);
        if (!v) break;
        chosen.add(v);
        if (keys.has(drillKey(v.fingerprint))) continue; // ista vaja v drugem formatu
        if (exclusiveConflict(v.text, vs.map(x => x.text), settings)) continue;
        keys.add(drillKey(v.fingerprint));
        vs.push(v);
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
      // 6x50 in drugi redki formati ter več vaj v istem formatu naj bodo izjema.
      const fmts = vs.map(v => setFormat(v.text));
      const fw = settings.vaje_format_weights || {};
      fmts.forEach(f => { if (fw[f] != null && fw[f] < 0.5) score += 0.7; });
      score += fmts.length - new Set(fmts).size;
      if (warm) { const d = warmDays(warm); if (d !== null && d < 14) score += 3; }
      // Kadar šprinta ne sme biti, naj tudi vaje in zaključek ne prinesejo čez mejo metrov max.
      if (noSprint && maxM(main) + maxM(z) + maxM(warm) + vs.reduce((a, v) => a + maxM(v), 0) > settings.sprint_max_meters) score += 25;
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
      return { phase, text: t, set_id: set && set.source === 'db' ? set.id : null, source: set ? set.source : 'fiksno', main_type: set ? set.main_type : null, isNew: !!(set && set.isNew) };
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
    const sprint = isSprintTexts(tr.items.map(i => i.text));
    return tr.items.map(it => ({ date: tr.date, level: lvl, phase: it.phase, fingerprint: fingerprint(it.text), main_type: it.phase === 'glavna' && sprint ? 'sprint' : null }));
  }

  return {
    PHASES, PHASE_LABELS, LIBRARY_PHASES, DEFAULT_SETTINGS, REVIEW_CODES,
    buildDict, parseLine, parseText, toStructure, normalizeText, fingerprint, bVariant,
    estimateMinutes, parseTime, formatTime, libraryFromTrainings, generateTraining, arrangeOrder,
    weekSlots, historyFromTraining, historyLevel, lastUseDays, lastDrillDays, drillKey, setFormat,
    availableDrills, drillWeight, suggestNewSet, exclusiveConflict, exclusiveTooSoon, lastExclusiveDays, maxMeters, isSprintTexts, isSprintMain, addDays, daysBetween, weekday, mulberry32
  };
});
