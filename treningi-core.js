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
    // Najdaljša posamezna razdalja max (noge ali šprint); ponovitev v seriji je lahko več.
    max_distance: 100,
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
    // Kombinacije, ki niso vaja (VATERPOLO je samo ali VATERPOLO STEGR).
    invalid_drills: ['VATERPOLO ŠPRICANJE'],
    // Apneistične vaje (pod vodo, brez dihanja): v istem tednu samo na enega od teh dni (1 = pon, 4 = čet), ker večina hodi samo takrat.
    apnea_pair_weekdays: [1, 4],
    // Salto in preval največ enkrat v tednu (pon–ned) za isti nivo.
    weekly_once_codes: ['SALTO', 'PREVAL'],
    // Nivo A (in B): praviloma dve seriji vaj; delež treningov s tremi.
    three_drills_chance: 0.12,
    // Trening s to oceno ali višjo je zgled za nove predloge.
    example_min_rating: 8,
    // Daljše glavne (m) po zgradbi posnemamo le redko, tudi če so zgled.
    example_main_max: { A: 1100 },
    example_long_chance: 0.15,
    // Skupni trening A+B: enkrat na mesec ob četrtkih, vsaj toliko dni narazen, glavna samo iz 50 m.
    joint: { weekday: 4, min_gap_days: 21, meters_min: 2000, meters_max: 2200 },
    // Dan v tednu (1 = ponedeljek) -> skupine nivojev, ki imajo vsaka svoj trening.
    day_levels: { 1: [['A', 'B']], 3: [['A'], ['C']], 4: [['A', 'B']] },
    // Privzeti štart glavne serije, če ni zapisan (sekunde po dolžini).
    default_start_sec: { 50: 60, 75: 90, 100: 120, 200: 210 },
    // Ciljni časi (kravl) po nivoju in razdalji; B in C jih nimata.
    target_times: { A: { 50: { T: '38-42', HIT: '33-38' }, 100: { T: '1:18-1:30', HIT: '1:15-1:25' } } }
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
    ['ŠPRICANJE', 'RRU: ob koncu potega izpljuskneš vodo (ne pri vaterpolu)', 'vaja'],
    ['GERMANJA', 'pomožna tehnika (podvodni del hrbtnega potega)', 'vaja'],
    ['BIONDI', 'delfin vaja, skoraj enaka kot ORKA; nikoli skupaj z ORKA', 'vaja'],
    ['RV', 'roka ven, 90° (npr. KN RV 90°)', 'vaja'],
    ['PPDZ', 'RRU: ponavljaj prednji del zavesljaja', 'vaja'],
    ['ŠTETJE', 'štetje zavesljajev', 'vaja'],
    ['KR', 'kravl roke (DN KR = delfin noge, kravl roke)', 'vaja'],
    ['DR', 'delfin roke (KN DR = kravl noge, delfin roke)', 'vaja'],
    ['PR', 'prsno roke (PR DN = prsno roke, delfin noge)', 'vaja'],
    ['PZDZ', 'ponovi zadnji del zavesljaja', 'vaja'],
    ['STEGR', 'stegnjene roke (RRU ali normalna tehnika)', 'vaja'],
    ['POUDAREK PDZ', 'KV: poudarek na prvem (prednjem) delu zavesljaja', 'vaja'],
    ['1-1-1', 'prsno: 1 zavesljaj z eno roko, 1 z drugo, ena cela koordinacija', 'vaja'],
    ['VAJE HITROSTI', 'v 25 m šprintaš del razdalje: vmes, v cilj ali od štarta', 'vaja'],
    ['PONOVITEV NAD VODO', 'HN: zavesljaj do konca, roko vrneš ob telo in še enkrat ponoviš', 'vaja'],
    ['ROTACIJA ZAPESTJA', 'HV RRU: rotacija zapestja, medtem ko pelješ roko nazaj nad gladino', 'vaja'],
    ['RS', 'roke spredaj (noge na trebuhu)', 'vaja'],
    ['DZ', 'delfin zavesljaji (npr. tja desna, nazaj leva)', 'vaja'],
    ['ROKE', 'samo roke, noge popolnoma pri miru', 'izpeljava'],
    ['KOMB', 'noge: med plavanjem menjaš položaj telesa', 'vaja'],
    ['BREZ VDIHA', 'poskusiš odplavati 50 m brez vdiha', 'drugo'],
    ['5+1', '5 tempo, 1 hitro', 'stopnjevanje'],
    ['6-3-6', '6 udarcev na boku, 3 zavesljaji, 6 udarcev na drugem boku', 'vaja'],
    ['3-1', 'H 3-1: trije udarci, 1 koordinacija', 'vaja'],
    ['OBRATNO', 'mešano v obratnem vrstnem redu (NORMALNO / OBRATNO); pri KZ dihanje kontra', 'drugo'],
    ['GLADINA', 'RRU GLADINA (kravl): prsti drsijo po gladini vode', 'vaja'],
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
  const FILLER = new Set(('HITER PREHOD USTAVLJANJA HITRI UDARCI HRBET TREBUH GLAVA VODI ZUNAJ S SKOKOM SKOK CELA MANJ VDIHOV POČASNEJE VSE ISTI ŽELJI DLAN PODVODNI PODVODNIM SREDINI STENO KONCU EASY SALTO POL FREK VEN ZADNJIH METULJČEK LEVA DESNA VDIH NAPREJ Z NA PO POD ČIM DLJE DALJŠI VIŠJI VODO BREZ DIHANJA DIHANJE VDIHA VSAK VSAKIČ ROKA UZ ZAVES ODRIV HRBTU NAZAJ ' +
    'ZAVESLJAJI ZAVESLJAJ VISOK KOMOLEC KOMOLCEM POLOŽAJ MENJAMO KONTRA HITRO POČASI TEMPO MEŠANO PRSNO KRAVL ' +
    'HRBTNO DELFIN DESKA DESKO VALČEK LOP RAMENA IN ALI ŠTARTI ŠTART X 1. 2. 3. CT/N/V/CT N/V/CT DO TAKOJ').split(/\s+/));

  const TECH_PREFIXES = ['MM', 'K', 'H', 'P', 'D', 'M'];
  const SUFFIXES = ['RRU', 'VL', 'PL', 'BD', 'CT', 'ML', 'N', 'V', 'L', 'Z', 'R'];

  function buildDict(dbCodes, includeReview) {
    const dict = new Map();
    const phraseWords = [];
    const add = (c, source) => {
      const entry = { code: c.code, meaning: c.meaning, category: c.category, source };
      [c.code].concat(c.aliases || []).forEach(k => {
        const key = String(k).toUpperCase();
        if (!dict.has(key)) dict.set(key, entry);
        // Deli večbesedne kratice (npr. DN 360, H SPIN) niso neznane besede.
        if (key.includes(' ')) key.split(/\s+/).forEach(w => { if (w.length > 2 && !/^\d/.test(w)) phraseWords.push([w, entry]); });
      });
    };
    (dbCodes || []).forEach(c => add(c, 'db'));
    if (includeReview !== false) REVIEW_CODES.forEach(c => add(c, 'pregled'));
    phraseWords.forEach(([w, e]) => { if (!dict.has(w) && !FILLER.has(w)) dict.set(w, e); });
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
      if (/^\d+:\d\d(-\d+:\d\d)?$/.test(raw)) { out.params.push(raw); continue; } // ciljni čas, npr. T 1:20
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
      if (/^\d+\.?$/.test(t) || /^\d+[x×]$/i.test(t) || /^\d+°$/.test(t) || /^\d+(-\d+)?[sm]$/.test(t)) continue;
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
    // Del ponovitve na max: "75 T + 25!" -> 25, "25 K! + 25 RAZP" -> 25, sicer cela dolžina ali nič.
    const perRep = (txt) => {
      const segs = txt.split('+').map(x => x.match(/(\d+)(!|\s*$|\s+(?![\d@])[^]*|\s+@[^]*)/)).filter(Boolean);
      if (segs.length > 1) return segs.reduce((a, x) => a + (isMaxText(x[2]) ? +x[1] : 0), 0);
      return isMaxText(txt) ? dist : 0;
    };
    // Različice po ponovitvah (1x T 1x 75 T + 25!): skupni del pred njimi velja za vse.
    // Različica: "1x T", "1x 75 T + 25!" (tudi z dolžino za 1x).
    const alt = rest.match(/(?:^|\s)\d+\s*x\s*(?:\d+\s+)?[^\d\s][^]*?(?=\s\d+\s*x\s*(?:\d+\s+)?[^\d\s]|$)/gi);
    if (alt && alt.length > 1) {
      alt.forEach((t, k) => { alt[k] = t.trim(); });
      // "1x T" pred različicami "75 T + 25!", "50 T + 50!" ni svoja ponovitev, ampak opis vseh (T je v vsaki).
      const word = (t) => t.replace(/^\d+\s*x\s*/i, '').trim().toUpperCase();
      const lead = word(alt[0]);
      const base = rest.slice(0, rest.indexOf(alt[0])).trim();
      if (/^(T|TEMPO)$/.test(lead) && alt.slice(1).every(t => word(t).includes('+') && word(t).split('+')[0].trim().split(/\s+/).pop() === lead)) alt.shift();
      const n = alt.map(a => parseInt(a, 10));
      const sum = n.reduce((a, b) => a + b, 0);
      return Math.round(reps * alt.reduce((a, t, k) => a + n[k] * perRep((base + ' ' + t.replace(/^\d+\s*x\s*/i, '')).trim()), 0) / sum);
    }
    return reps * perRep(rest.trim());
  }
  /** Koliko metrov v besedilu je max (K!, MAX, SIMULATOR; MAX OBRAT se ne šteje). */
  function maxMeters(text) {
    return cleanQuotes(text).split(/\n/).reduce((a, l) => a + maxMetersLine(l), 0);
  }
  function isSprintTexts(texts, settings) {
    const limit = (settings && settings.sprint_max_meters) || DEFAULT_SETTINGS.sprint_max_meters;
    return texts.reduce((a, t) => a + maxMeters(t), 0) > limit;
  }
  /** Najdaljša razdalja max v enem kosu: 6x50 MAX NOGE -> 50, 3x( 50 MAX / 50 RAZP ) -> 50, 200 K! -> 200. */
  function longestMaxLine(line) {
    const s = cleanQuotes(line).trim();
    let m;
    if ((m = s.match(/^\d+\s*[xX]\s*\((.*)\)(.*)$/))) return Math.max(0, ...m[1].split(/\s+\/\s+/).map(longestMaxLine));
    let dist, rest;
    if ((m = s.match(/^\d+\s*[xX]\s*(\d+)(?![\d'"])(.*)$/))) { dist = +m[1]; rest = m[2]; }
    else if ((m = s.match(/^(\d+)(?![\d'"xX])(.*)$/))) {
      const segs = s.split(/\s*[+,]\s*/);
      if (segs.length > 1 && segs.every(x => /^\d+(\s|$)/.test(x))) return Math.max(0, ...segs.map(x => (isMaxText(x) ? parseInt(x, 10) : 0)));
      dist = +m[1]; rest = m[2];
    } else return 0;
    if (!isMaxText(rest)) return /\b4-3-2-1\b/.test(rest) ? dist : 0;
    const arrows = rest.match(/[↑↓][^↑↓]*/g);
    if (arrows && arrows.length > 1) return dist * arrows.filter(isMaxText).length / arrows.length;
    const segs = rest.split('+').map(x => x.match(/(\d+)(!|\s*$|\s+(?![\d@])[^]*|\s+@[^]*)/)).filter(Boolean);
    if (segs.length > 1 && !/\d+\s*x\s/i.test(rest)) return Math.max(0, ...segs.map(x => (isMaxText(x[2]) ? +x[1] : 0)));
    return dist;
  }
  function overMaxDistance(text, settings) {
    const limit = (settings && settings.max_distance) || DEFAULT_SETTINGS.max_distance;
    return cleanQuotes(text).split(/\n/).some(l => longestMaxLine(l) > limit);
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

  // ---------- Ciljni časi (T 38-42, HITRO 1:15-1:25) ----------
  const TARGET_RE = /(^|[\sxX])(T|TEMPO|HIT|HITRO)\s+(?:\d:\d\d(?:-\d:\d\d)*|\d\d(?:-\d\d)+(?![\d'":])|\d\d(?=\s*(?:$|@|\)|\/|\d+\s*[xX](?:\s|\())))/gim;
  /** Besedilo brez ciljnih časov; ista serija z drugim ciljnim časom je še vedno ista serija. */
  function stripTargets(text) { return String(text || '').replace(TARGET_RE, '$1$2'); }

  // Ciljni časi veljajo za kravl: ne za druge tehnike, rekvizite, noge ali skok.
  const NO_TARGET = /(^|[\s/↑↓+(]|\d[xX])(H|P|D|M|MM|MB[KHPD]|MAD|N|NOGE|VAJE|PL|VL|KVL|KPL|KV|KN|KL|HN|HV|DN|DV|PN|PV|V|L|STIL|VB1T|PR|KR|DR|ROKE|SKOKOM|RAZP|BD|KBD|POČASI|VSAK)(?=$|[\s/+)])/i;
  function targetsForPiece(piece, times) {
    const m = piece.match(/^(\s*(?:\d+\s*[xX]\s*)?)(\d+)(?![\d'"xX])(.*)$/);
    if (!m || !times[m[2]] || /^\s*\d+\s+[A-ZČŠŽ]|[+↑↓!]|\bMAX\b/i.test(m[3])) return piece;
    // Različice (4x TEMPO 4x HITRO) obravnavaj vsako posebej.
    const isAlt = g => /^\s\d+\s*[xX]\s*[^\d\s]/.test(g);
    const segs = m[3].split(/(?=\s\d+\s*[xX]\s*[^\d\s])/);
    if (segs.length > 1 && !isAlt(segs[0]) && NO_TARGET.test(segs[0])) return piece;
    const out = segs.map(g => {
      if (NO_TARGET.test(g)) return g;
      return g.replace(/(^|\s|\d[xX])(T|TEMPO|HIT|HITRO)(?=\s|$)/i, (all, pre, w, off) => {
        if (/\d\s*$/.test(g.slice(0, off))) return all; // npr. "VSAK 4. 25 HITRO"
        const t = times[m[2]][/^T/i.test(w) ? 'T' : 'HIT'];
        return t ? `${pre}${w} ${t}` : all;
      });
    });
    return m[1] + m[2] + out.join('');
  }
  /** Doda privzete ciljne čase glavni seriji, kjer še niso zapisani. */
  function addTargets(text, level, settings) {
    const times = ((settings && settings.target_times) || DEFAULT_SETTINGS.target_times)[level];
    if (!times) return text;
    return String(text || '').split('\n').map(line => {
      if (stripTargets(line) !== line) return line;
      const m = line.match(/^(\s*\d+\s*[xX]\s*\(\s*)(.*?)(\s*\).*)$/);
      if (m) return m[1] + m[2].split(/(\s+\/\s+)/).map((p, i) => (i % 2 ? p : targetsForPiece(p, times))).join('') + m[3];
      return targetsForPiece(line, times);
    }).join('\n');
  }

  // "Povsem enak zapis": velike črke, enotni narekovaji, en presledek, gol čas -> @čas.
  function normalizeText(text) {
    return stripTargets(cleanQuotes(text)).split(/\n/).map(l => l.trim()).filter(Boolean).map(l =>
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
    // B nima ciljnih časov.
    return { text: stripTargets(out), changed, note: changed ? '' : 'ni česa skrajšati: daljši štart ali + PL' };
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
    // KN RV in KN RV 90° sta ista vaja (star in nov zapis).
    return String(fp || '').split('\n').map(l => l.replace(/^\d+X\s*\d+\s*/, '').replace(/\bRV(?! 90°)/g, 'RV 90°').replace(/^([KHDP][NVZ]) PL\b/, 'PL $1').trim()).join('\n');
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

  /** Zapis po trenerjevem pravilu: PL pred nogami in vajami (4x50 HN PL -> 4x50 PL HN). */
  function tidyText(text) {
    return String(text || '').split('\n').map(l => l.replace(/^(\s*\d+\s*[xX]\s*\d+)\s+([KHDP][NVZ])\s+PL\b/, '$1 PL $2')).join('\n');
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

  // Vaje, kjer se plava enkrat na eni in enkrat na drugi strani: število dolžin mora biti sodo.
  const ONE_SIDED = /\bBOK\b|\bSUPERMAN\b|\bRV\b|\bROKA VEN\b/;
  function unevenSides(text) {
    return String(text || '').split('\n').some(line => {
      const m = line.match(/^(\d+)x(25|50)(?!\d)\s*(.*)$/);
      if (!m || !ONE_SIDED.test(m[3])) return false;
      const lengths = +m[1] * (+m[2] / 25);
      const arrows = m[3].match(/[↑↓][^↑↓]*/g);
      if (arrows && arrows.length > 1) return arrows.some(a => ONE_SIDED.test(a) && (lengths / arrows.length) % 2 !== 0);
      const alt = m[3].match(/\d+x\s*[^\d\s][^]*?(?=\s\d+x\s*[^\d\s]|$)/g);
      if (alt && alt.length > 1) {
        const n = alt.map(a => parseInt(a, 10)), sum = n.reduce((a, b) => a + b, 0);
        return alt.some((a, i) => ONE_SIDED.test(a) && (+m[1] * n[i] / sum) % 2 !== 0);
      }
      const segs = m[3].split('+');
      if (segs.length > 1) return +m[1] % 2 !== 0;
      return lengths % 2 !== 0;
    });
  }

  // Nivo C: če plavamo noge za eno tehniko, plavamo tudi vaje za isto tehniko.
  function strokeUse(text) {
    // KN DR, PR DN ipd. so kombinacije rok in nog, ne čiste noge.
    const t = (' ' + String(text || '').toUpperCase().replace(/[↑↓+\/(),]/g, ' ').replace(/\b\d+X(?=[A-ZČŠŽ])/g, ' ') + ' ')
      .replace(/\s+/g, ' ').replace(/ [KDHP]N [KDP]R(?= )/g, ' ').replace(/ [KDP]R [KDHP]N(?= )/g, ' ');
    const legs = new Set(), drills = new Set();
    (t.match(/ [KHDP]N(?= )/g) || []).forEach(x => legs.add(x[1]));
    if (/ (KV|KZ|VATERPOLO|SHARK|PACMAN|KBD) | K (RRU|SHARK|6-3-6|VISOK|PACMAN|STEGR|2-2) /.test(t)) drills.add('K');
    if (/ (HV|HZ) | H (RRU|6-1|3-1|6-3-6|HITLER) /.test(t)) drills.add('H');
    if (/ (DV|DZ|METULJČEK|ORKA|BIONDI) | D (DIH|\d-\d)/.test(t)) drills.add('D');
    if (/ (PV|PD|PPV|KRAJŠANJE) | P (\d-\d|ČIM DLJE|KRAJŠANJE)/.test(t) && !/ [KDH]N PV /.test(t)) drills.add('P');
    if (/ RRU /.test(t) && !/ (HV|H) RRU /.test(t)) drills.add('K');
    return { legs, drills };
  }
  /** Tehnike, za katere so noge, vaj pa ni. */
  function legsWithoutDrills(texts) {
    const legs = new Set(), drills = new Set();
    texts.forEach(x => String(x || '').split('\n').forEach(l => { const u = strokeUse(l); u.legs.forEach(v => legs.add(v)); u.drills.forEach(v => drills.add(v)); }));
    return Array.from(legs).filter(v => !drills.has(v));
  }

  // ---------- Nove serije ----------
  // Dva vira: (1) križanje delov serij, ki jih trener že ima v knjižnici (slog se uči sproti z vsakim uvozom),
  // (2) ideje v njegovem slogu iz potrjenih kratic. Vedno čakajo na pregled.
  const NEW_PARTS = {
    A: {
      noge: [['K', 'KN'], ['K', 'KN BOK'], ['K', 'KN SUPERMAN'], ['K', 'KN RV 90°'], ['D', 'DN'], ['D', 'DN BOK'], ['D', 'DN H'], ['H', 'HN'], ['H', 'HN ROTACIJA'], ['H', 'HN RV 90°']],
      vaje: [['K', 'KV 2-2'], ['K', 'K RRU PESTI'], ['K', 'K RRU PALEC'], ['K', 'K RRU ZADRGA'], ['K', 'K RRU ŠPRICANJE'], ['K', 'K RRU RINEŠ'], ['K', 'K RRU PPDZ'], ['K', 'K RRU GLADINA'], ['K', 'K 6-3-6'],
        ['K', 'K SHARK 1'], ['K', 'K SHARK 2'], ['K', 'K SHARK 3'], ['K', 'K VISOK KOMOLEC'], ['K', 'VATERPOLO'], ['K', 'KZ'], ['K', 'K STEGR'], ['K', 'K RRU STEGR'],
        ['D', 'DV 1-1-2'], ['D', 'DV 2-2-2'], ['D', 'DV 3-3'], ['D', 'DV ORKA'], ['D', 'DV BIONDI'], ['D', 'DV 6-1'], ['D', 'D DIH NA 1'], ['D', 'DN KR'],
        ['H', 'HV RRU 90°'], ['H', 'HV ROKA VEN ZAVES'], ['H', 'H 6-1'], ['H', 'H 3-1'], ['H', 'HV HITLER']]
    },
    C: {
      noge: [['K', 'KN'], ['K', 'KN BOK'], ['K', 'KN SUPERMAN'], ['K', 'KN RV 90°'], ['H', 'HN'], ['H', 'HN ROTACIJA'], ['H', 'HN 90°']],
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
    // Potrjene vaje z določeno razdaljo (25 ali 25/50 m).
    const own = ((opts && opts.drills) || []).filter(d => d.active !== false && d.category === 'vaja' && (d.distances || []).length &&
      (!(d.levels || []).length || d.levels.includes(lk)));
    if (own.length && rng() < 0.25) {
      const d = one(own), cela = { K: 'K CT', H: 'H CT', D: 'D CT', P: 'P' }[d.stroke];
      const n25 = lk === 'C' ? 8 : 10;
      // Oprema potrjene vaje: PL, BREZ PL ali oboje; brez podatka velja s plavutkami.
      const eq = d.equipment || [];
      const pl = eq.includes('BREZ PL') ? (eq.includes('PL') ? one(['PL ', '']) : '') : 'PL ';
      const forms = [`8x25 ${pl}${d.code}`];
      if (cela) forms.push(`${n25}x25 ${pl}↑${d.code} ↓${cela}`, `8x25 ${pl}3x ${d.code} 1x ${cela}`);
      if (d.distances.includes(50)) forms.push(`4x50 ${pl}${d.code}`);
      return one(forms);
    }
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

  /** Nov zaključek v trenerjevem slogu (kratke serije, sculling, noge, hitri 25-ki). */
  function newZak(lk, rng) {
    const one = a => a[Math.floor(rng() * a.length)];
    if (lk === 'C') {
      return one([
        () => `8x25 1x MAX 1x RAZP`,
        () => `4x50 DESKA 1x${one(['PN', 'KN'])} 1x${one(['KN', 'HN'])}`,
        () => `6x25 ${one(['SCULLING', 'PPV', 'K CT', 'H CT'])}`,
        () => `4x50 ${one(['P', 'K', 'H'])} 25! + 25 RAZP`,
        () => `8x25 ↑${one(['K', 'H'])} HITRO ↓P`
      ])();
    }
    return one([
      () => `${one([6, 8])}x25 ${one(['SCULLING', 'POPAJ', 'VATERPOLO', 'KBD', 'PPV', 'ROKE L', 'V ML PR', 'K ŠTETJE', 'VAJE HITROSTI'])}`,
      () => `8x25 ↑${one(['N!', 'STIL MAX', 'D!', 'K!'])} ↓${one(['H', 'GERMANJA', 'RAZP'])}`,
      () => `4x50 ${one(['PL 25! + 25 RAZP', 'KN DESKA', 'K/H NA DOLGO', 'PL ↑MAX ↓RAZP'])}`,
      () => `${one([200, 300])} VL${one(['', ' DOLGO', ' SALTO OBRAT'])}`,
      () => `2x( 50 MAX / 50 RAZP )`,
      () => `6x50 ↑PPV ↓GERMANJA`,
      () => `8x25 1x KBD 1x ${one(['H', 'P', 'D'])}`
    ])();
  }

  /** Druga oblika razplavanja enake dolžine (ni serija knjižnice). */
  function newRazp(phase, meters, rng, current) {
    const one = a => a[Math.floor(rng() * a.length)];
    const m = meters || { razplavanje: 300, vmesno_razplavanje: 50, zakljucno_razplavanje: 100 }[phase] || 100;
    const forms = [`${m} RAZP`, `${m} RAZP POČASI DOLGO`, `${m} RAZP PO ŽELJI`, `${m} RAZP K/H`];
    if (m >= 100 && m % 50 === 0) forms.push(`${m} RAZP MEŠANO PO 25`, `${m} RAZP ${one(['H', 'K'])} DOLGO`);
    if (phase === 'razplavanje' && m >= 200) forms.push(`${m} RAZP VSAKIH 50 DRUGA TEHNIKA`, `${m} RAZP ZADNJIH 100 H`);
    const options = forms.filter(f => f !== String(current || '').trim() && parseText(f, new Map()).meters === m);
    return options.length ? one(options) : `${m} RAZP`;
  }

  function newMain(lk, rng, opts) {
    const one = a => a[Math.floor(rng() * a.length)];
    const pick = (a, n) => { const c = a.slice(), r = []; while (r.length < n && c.length) r.push(c.splice(Math.floor(rng() * c.length), 1)[0]); return r; };
    const uniq = a => a.filter((x, i) => a.indexOf(x) === i).join('\n');
    const sprint = !!(opts && opts.sprint);
    // Zgradba glavnih, ki so bile trenerju všeč.
    const longMains = (opts && opts.exampleLong) || [];
    const liked = longMains.length && rng() < DEFAULT_SETTINGS.example_long_chance ? longMains : (EXAMPLE_MAINS[lk] || []).concat((opts && opts.exampleMains) || []);
    if (!sprint && liked.length && rng() < 0.15) {
      const t = likeMain(one(liked), opts && opts.library, lk, rng);
      if (t) return t;
    }
    if (opts && opts.only50 && lk !== 'C') {
      const st = one([`@1'`, `@1'05"`, `@1'10"`]);
      const t50 = ['VL', 'K', 'MAD', 'MBK', 'M', 'K STOP', 'K 2+1', 'K DIH 5-7', 'K ČMZ', 'H/K', 'KVL'];
      const fast50 = [`6x50 25 K! + 25 RAZP ${st}`, `8x50 ↑STIL! ↓RAZP ${st}`, `4x50 25 D! + 25 RAZP ${st}`];
      const mid50 = [`4x50 K 3+1 ${st}`, `8x50 K 3+1 ${st}`, `6x50 K 5+1 ${st}`, `6x50 MBK ${st}`, `6x50 KVL ${st}`, `8x50 MM ${st}`, `6x50 PL NOGE 1x MAX 1x EASY @1'10"`, `4x50 25 D + 25 K ${st}`, `8x50 4x STOP 1-4 4x RG 4-1 ${st}`];
      return one(sprint ? [
        () => uniq([one(mid50), one(fast50), one(fast50)]),
        () => `4x( 3x50 K T ${st} / 50 K! ${st} / 50 RAZP )`
      ] : [
        () => `3x( ${one([5, 6])}x50 ${st} ) ${pick(t50, 3).map(t => '1x ' + t).join(' ')}`,
        () => `4x( 4x50 ${st} ) ${pick(t50, 4).map(t => '1x ' + t).join(' ')}`,
        () => uniq(pick(mid50, 3)),
        () => uniq(pick(mid50, 2)) + `\n50 RAZP\n` + one([`6x50 ${one(t50)} ${st}`, `8x50 ${one(t50)} ${st}`]),
        () => `${one([4, 5])}x( 3x50 K T ${st} / 50 ${one(['M', 'H', 'D/K'])} ${st} )`
      ])();
    }
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
    const mix = [`3x100 M @2'`, `2x100 M @2'`, `4x50 MBK @1'`, `4x75 MBK @1'30"`, `4x50 25 D + 25 K @1'`, `4x75 50 K + 25 D @1'30"`, `4x50 KN @1'20"`, `6x25 NOGE @35"`, `2x100 PL NOGE @2'`, `6x50 PL NOGE 1x MAX 1x EASY @1'10"`, `4x50 PL NOGE 1x MAX 1x EASY @1'10"`];
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
      glavna: level === 'C' ? [300, 450] : [700, 1250],
      zakljucek: level === 'C' ? [100, 250] : [100, 400]
    }[phase];
    if (!limits) return null;
    const make = { vaje: newDrill, ogrevalna: newWarmup, glavna: newMain, zakljucek: newZak }[phase];
    for (let i = 0; i < 120; i++) {
      const raw = make(level, rng, { sprint: opts.sprint, only50: opts.only50, library, drills: opts.drills, exampleMains: opts.exampleMains, exampleLong: opts.exampleLong });
      // Vaje praviloma s plavutkami.
      const text = phase === 'vaje' ? withFins(raw) : raw;
      const fp = fingerprint(text);
      if (known.has(key(fp))) continue;
      // Ista vaja na obeh straneh (↑X ↓X, 1x X 1x X) ni smiselna.
      const halves = text.match(/[↑↓][^↑↓]+/g);
      if (halves && halves.length === 2 && halves[0].slice(1).trim() === halves[1].slice(1).trim()) continue;
      if (exclusiveConflict(text, opts.others, settings)) continue;
      if (overMaxDistance(text, settings) || invalidDrill(text, settings)) continue;
      if (opts.date && isApnea(text) && apneaPairUsed(history, level, opts.date, settings)) continue;
      if (opts.date && isWeeklyOnce(text, settings) && weeklyOnceUsed(history, level, opts.date)) continue;
      if (isApnea(text) && opts.others && apneaRepeat(opts.others.concat(text), history, level)) continue;
      if (phase === 'glavna' && opts.only50 && !onlyFifties(text)) continue;
      if (unevenSides(text)) continue;
      if (opts.date && exclusiveTooSoon(text, history, level, opts.date, settings)) continue;
      if (phase === 'glavna' && isSprintTexts([text], settings) !== !!opts.sprint) continue;
      const meters = parseText(text, dict).meters;
      if (meters < limits[0] || meters > (phase === 'glavna' && opts.only50 && level !== 'C' ? Math.min(limits[1], 1000) : limits[1])) continue;
      return { phase, text, meters, fingerprint: fp, levels: [level], source: 'nova', isNew: true, main_type: phase === 'glavna' && opts.sprint ? 'sprint' : null };
    }
    return null;
  }

  // ---------- Zgledi (treningi z oceno 8 ali več) ----------
  // Glavne, ki so bile trenerju zelo všeč (odzivi pred uvedbo ocen); nove serije posnemajo njihovo zgradbo.
  const EXAMPLE_MAINS = { A: [`5x50 KVL @1'\n5x50 PL NOGE 1x MAX 1x EASY @1'10"\n5x50 @50"\n5x50 KVL @1'`] };

  /** Vloga vrstice v glavni seriji: pripomoček, noge, kratek štart, druga tehnika, kravl, razplavanje. */
  function lineRole(line) {
    const t = ' ' + String(line).toUpperCase() + ' ';
    if (/ RAZP /.test(t) && !/\+/.test(t)) return 'razp';
    if (/ (NOGE|[KDHPM]N|N) /.test(t)) return 'noge';
    if (/ (KVL|VL|MAD|KPL|KL) /.test(t)) return 'pripomocek';
    if (/ (M|MM|MB[KDP]|H|D|P|STIL) |\d [HDP]\b/.test(t)) return 'tehnika';
    const m = t.match(/^\s*\d+\s*X\s*(\d+).*@\s*(\d+'\d*"?|\d+"|\d+')/);
    const def = m && DEFAULT_SETTINGS.default_start_sec[m[1]], st = m && parseTime(m[2].replace(/(\d)"?$/, (x, d) => (/'/.test(m[2]) || /"$/.test(m[2]) ? x : d)));
    if (def && st && st < def) return 'kratek';
    return 'kravl';
  }
  const mainRoles = (text) => String(text || '').split('\n').filter(l => l.trim()).map(lineRole);
  /** Ali ima glavna podobno zgradbo kot zgled (vsaj tri vrstice in vse njegove vloge). */
  function likeStructure(text, example) {
    const a = mainRoles(text), b = mainRoles(example);
    return a.length >= 3 && b.length >= 3 && Array.from(new Set(b)).every(r => a.includes(r));
  }

  /** Zgledi za nivo: examples = [{ date, level, rating, liked, items: [{ phase, text }] }]. Brez označenih vidikov veljajo vse faze. */
  function exampleSets(examples, level, settings) {
    const min = (settings && settings.example_min_rating) || DEFAULT_SETTINGS.example_min_rating;
    const keys = new Map(), mains = [], longMains = [];
    const maxMain = ((settings && settings.example_main_max) || DEFAULT_SETTINGS.example_main_max)[level] || Infinity;
    (examples || []).filter(e => e.level === level && Number(e.rating) >= min).forEach(e => {
      const liked = (e.liked || []).length ? e.liked : LIBRARY_PHASES;
      (e.items || []).forEach(i => {
        if (!liked.includes(i.phase)) return;
        const k = i.phase + '|' + (i.phase === 'vaje' ? drillKey(fingerprint(i.text)) : fingerprint(i.text));
        keys.set(k, Math.max(keys.get(k) || 0, Number(e.rating)));
        if (i.phase === 'glavna' && i.text.split('\n').length >= 3) (parseText(i.text, new Map()).meters <= maxMain ? mains : longMains).push(stripTargets(i.text));
      });
    });
    return { keys, mains, longMains };
  }

  /** Nova glavna po zgradbi zgleda: iste vloge in razdalje, druge vrstice iz knjižnice. */
  function likeMain(example, library, lk, rng) {
    const lines = example.split('\n').map(l => l.trim()).filter(Boolean);
    const pool = [];
    (library || []).filter(x => x.phase === 'glavna' && (x.levels || []).includes(lk)).forEach(x => x.text.split('\n').forEach(l => { if (/^\d+x\d+ .*@/.test(l) && !/\bT \d|štart/i.test(l)) pool.push(stripTargets(l.trim())); }));
    const swap = new Map();
    lines.forEach(l => {
      if (swap.has(l)) return;
      const m = l.match(/^(\d+)x(\d+) /);
      const cand = !m || rng() < 0.25 ? [] : pool.filter(x => { const y = x.match(/^(\d+)x(\d+) /); return y[2] === m[2] && x !== l && lineRole(x) === lineRole(l) && !/ \d+x[A-ZČŠŽ]| \d+x /.test(x.slice(y[0].length)); });
      swap.set(l, cand.length ? cand[Math.floor(rng() * cand.length)].replace(/^\d+x/, m[1] + 'x') : l);
    });
    const out = lines.map(l => swap.get(l)).join('\n');
    return out === lines.join('\n') ? null : out;
  }

  /**
   * Vaje se skoraj vedno plavajo s plavutkami. Izjeme: prsno (noge, vaje, podvodno), sculling,
   * male lopatke in zapisi, ki plavutke že omenjajo (PL, BREZ PL, 2x PL 2x BREZ).
   */
  function finsExempt(text) {
    const t = ' ' + normalizeText(text).replace(/[↑↓+\/(),]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const u = strokeUse(text);
    return u.drills.has('P') || u.legs.has('P') || / (P|PPV|PD|PN|GERMANJA|SCULLING|POPAJ|ML|BREZ|METULJČEK) /.test(t);
  }
  const needsFins = (text) => !/(^|\s)PL(\s|$)/.test(normalizeText(text)) && !finsExempt(text);
  /** Doda PL za ponovitvami, če ga vaja potrebuje (npr. "8x25 KN BOK" -> "8x25 PL KN BOK"). */
  function withFins(text) {
    return needsFins(text) ? String(text).replace(/^(\s*\d+\s*x\s*\d+)\s+/i, '$1 PL ') : text;
  }

  // ---------- Apneistične vaje in salto ----------
  /** Vrste apneističnih vaj v zapisu: pv (pod vodo), ppv (prsno pod vodo), bd (brez dihanja). */
  function apneaKinds(text) {
    const t = ' ' + normalizeText(text).replace(/[↑↓+\/(),]/g, ' ').replace(/\s+/g, ' ') + ' ';
    const out = new Set();
    if (/ \d+ ?M PV | [DKH]N(?: H)? PV | PV [DKH]N | POD VODO | NPV | ZADNJIH \d+ ?M? DN | DN 360 | PODVODN/.test(t)) out.add('pv');
    if (/ PPV /.test(t)) out.add('ppv');
    if (/ K?BD | BREZ DIHANJA | BREZ VDIHA /.test(t)) out.add('bd');
    return out;
  }
  const isApnea = (text) => apneaKinds(text).size > 0;
  const isWeeklyOnce = (text, settings) => ((settings && settings.weekly_once_codes) || DEFAULT_SETTINGS.weekly_once_codes).some(w => hasWord(text, w));
  const mondayOfIso = (d) => addDays(d, 1 - weekday(d));
  /** Datum, ko je bil salto/preval že v istem tednu za ta nivo (ali null). */
  function weeklyOnceUsed(history, level, date) {
    const mon = mondayOfIso(date), sun = addDays(mon, 6);
    const h = (history || []).find(x => x.level === level && x.date !== date && x.date >= mon && x.date <= sun && isWeeklyOnce(x.fingerprint));
    return h ? h.date : null;
  }
  /** Datum apneistične vaje na drugem od parnih dni (pon/čet) v istem tednu ali null. */
  function apneaPairUsed(history, level, date, settings) {
    const days = ((settings && settings.apnea_pair_weekdays) || DEFAULT_SETTINGS.apnea_pair_weekdays);
    if (!days.includes(weekday(date))) return null;
    const mon = mondayOfIso(date);
    const others = days.map(d => addDays(mon, d - 1)).filter(d => d !== date);
    const h = (history || []).find(x => x.level === level && others.includes(x.date) && isApnea(x.fingerprint));
    return h ? h.date : null;
  }
  /** Ali sta bili ti serij že skupaj v istem treningu (zgled iz preteklosti). */
  function togetherBefore(fps, history, level) {
    const byDay = new Map();
    (history || []).forEach(h => { if (h.level !== level) return; const k = h.date; if (!byDay.has(k)) byDay.set(k, new Set()); byDay.get(k).add(stripTargets(h.fingerprint)); });
    for (const set of byDay.values()) if (fps.every(f => set.has(f))) return true;
    return false;
  }
  /** Iste vrste apneistična vaja dvakrat v treningu brez zgleda iz preteklosti. */
  function apneaRepeat(texts, history, level) {
    const seen = new Map();
    for (const t of texts) {
      for (const k of apneaKinds(t)) {
        if (seen.has(k) && !togetherBefore([fingerprint(seen.get(k)), fingerprint(t)], history, level)) return k;
        if (!seen.has(k)) seen.set(k, t);
      }
    }
    return null;
  }
  /** Opozorila za tedenska pravila na kartici. */
  function weekRuleIssues(texts, date, levels, history, settings) {
    const st = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    const lk = historyLevel(levels), out = [];
    const pair = texts.some(isApnea) && apneaPairUsed(history, lk, date, st);
    if (pair) out.push(`Apneistična vaja je bila ta teden že ${weekday(pair) === 1 ? 'v ponedeljek' : 'v četrtek'}: ne oba dneva.`);
    if (apneaRepeat(texts, history, lk)) out.push('Ista apneistična vaja dvakrat v treningu.');
    const used = texts.some(t => isWeeklyOnce(t, st)) && weeklyOnceUsed(history, lk, date);
    if (used) out.push(`Salto ali preval je ta teden že bil (${used.slice(8, 10).replace(/^0/, '')}. ${used.slice(5, 7).replace(/^0/, '')}.).`);
    return out;
  }

  /** Zapis z neveljavno kombinacijo vaj ali null. */
  function invalidDrill(text, settings) {
    const t = normalizeText(text).replace(/\s+/g, ' ');
    return ((settings && settings.invalid_drills) || DEFAULT_SETTINGS.invalid_drills).find(x => t.includes(x)) || null;
  }

  // ---------- Vaje iste tehnike skupaj ----------
  /** Tehnike, ki jih serija vadi (noge ali vaja); cela tehnika na povratku ne šteje. */
  function drillStrokes(text) {
    const out = new Set();
    String(text || '').split('\n').forEach(l => { const u = strokeUse(l); u.legs.forEach(x => out.add(x)); u.drills.forEach(x => out.add(x)); });
    return out;
  }

  /**
   * Tehnike, v katere se vriva vaja druge tehnike: mešana serija (↑hrbtne noge ↓kravl vaja),
   * čeprav ima ista tehnika v treningu še svojo serijo. Cela serija druge tehnike vmes je dovoljena.
   */
  function splitStrokes(texts) {
    const seq = (texts || []).map(drillStrokes), bad = new Set();
    'KHDP'.split('').forEach(k => {
      const idx = seq.map((x, i) => (x.has(k) ? i : -1)).filter(i => i >= 0);
      if (idx.length < 2) return;
      const pure = idx.filter(i => seq[i].size === 1), mixed = idx.filter(i => seq[i].size > 1);
      if (pure.length && mixed.length) bad.add(k);
    });
    return Array.from(bad);
  }

  /** Vrstni red (raje, ne nujno): iste tehnike skupaj, znotraj tehnike najprej noge, nato vaje. */
  function orderDrills(sets) {
    if (sets.length < 2 || sets.length > 6) return sets;
    const legsOnly = sets.map(x => { const u = strokeUse(String(x.text).replace(/\n/g, ' ')); return u.legs.size > 0 && u.drills.size === 0; });
    const info = sets.map(x => drillStrokes(x.text));
    const cost = o => {
      let v = 0;
      'KHDP'.split('').forEach(k => {
        const idx = o.map((i, pos) => (info[i].has(k) ? pos : -1)).filter(pos => pos >= 0);
        if (idx.length > 1) v += 10 * (idx[idx.length - 1] - idx[0] + 1 - idx.length);
        idx.forEach((a, n) => idx.slice(n + 1).forEach(b => { if (!legsOnly[o[a]] && legsOnly[o[b]]) v += 1; }));
      });
      return v;
    };
    let best = sets.map((x, i) => i), bc = cost(best);
    const walk = (head, rest) => {
      if (!rest.length) { const v = cost(head); if (v < bc) { bc = v; best = head; } return; }
      rest.forEach((x, i) => walk(head.concat(x), rest.slice(0, i).concat(rest.slice(i + 1))));
    };
    if (bc > 0) walk([], best);
    return best.map(i => sets[i]);
  }

  // ---------- Skupni trening (A in B skupaj) ----------
  /** Ali je serija sestavljena samo iz 50 m dolžin. */
  function onlyFifties(text) {
    const lines = cleanQuotes(text).split('\n').map(l => l.trim()).filter(Boolean);
    return lines.length > 0 && lines.every(l => {
      const g = l.match(/^\d+\s*[xX]\s*\((.*?)\)/);
      return (g ? g[1] : l).split(/\s\/\s/).every(p => {
        const m = p.trim().match(/^(?:(\d+)\s*[xX]\s*)?50(?!\d)(.*)$/);
        // Znotraj 50 m je lahko 25 + 25, ne pa še kakšna dolžina poleg (50 + 50, 1x 100).
        return !!m && parseText(p.trim(), new Map()).meters === 50 * (+m[1] || 1) && !/(75|100|125|150|200|300|400)/.test(m[2]);
      });
    });
  }

  /** Ciljni metri nivoja; skupni trening ima svoj (krajši) razpon. */
  function jointLevel(lv, joint, settings) {
    if (!joint) return lv;
    const j = Object.assign({}, DEFAULT_SETTINGS.joint, (settings && settings.joint) || {});
    return Object.assign({}, lv, { meters_min: j.meters_min, meters_max: j.meters_max });
  }

  /**
   * Skupni trening: četrtek, v tem mesecu ga še ni in od drugih je vsaj min_gap_days dni.
   * dates: datumi skupnih treningov (shranjenih in predlaganih).
   */
  function jointStatus(date, levels, dates, settings) {
    const j = Object.assign({}, DEFAULT_SETTINGS.joint, (settings && settings.joint) || {});
    const possible = weekday(date) === j.weekday && levels.includes('A') && levels.includes('B');
    const others = (dates || []).filter(d => d !== date);
    const gap = others.length ? Math.min(...others.map(d => Math.abs(daysBetween(d, date)))) : null;
    const sameMonth = others.some(d => d.slice(0, 7) === date.slice(0, 7));
    return { possible, gap, sameMonth, tooSoon: gap !== null && gap < j.min_gap_days, due: possible && !sameMonth && (gap === null || gap >= j.min_gap_days) };
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
    // Skupni trening A+B je malo krajši.
    const lv = jointLevel(settings.levels[lk], opts.joint, settings);
    const date = opts.date;
    const history = opts.history || [];
    const rng = mulberry32(opts.seed != null ? opts.seed : Date.now() % 2147483647);
    const notes = [];

    const noApnea = !!apneaPairUsed(history, lk, date, settings);
    const noSalto = !!weeklyOnceUsed(history, lk, date);
    const lib = (opts.library || []).filter(s => s.active !== false && (s.levels || []).includes(lk) && !overMaxDistance(s.text, settings) && !invalidDrill(s.text, settings) &&
      !(noApnea && isApnea(s.text)) && !(noSalto && isWeeklyOnce(s.text, settings)));
    const byPhase = p => lib.filter(s => s.phase === p);

    const joint = !!opts.joint;
    // Skupni trening: glavna samo iz 50 m in krajša (da trening ostane v 2000–2200 m).
    const jointMainMax = lv.meters_max - 1150;
    let mains = byPhase('glavna').filter(s => mainAvailability(s, history, lk, date, settings).ok && (!joint || (onlyFifties(s.text) && s.meters <= jointMainMax)));
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
    // Serije iz zgledov (ocena 8+) in glavne s podobno zgradbo imajo prednost; pravila o ponavljanju ostanejo.
    const ex = exampleSets(opts.examples, lk, settings);
    const likedMains = (EXAMPLE_MAINS[lk] || []).concat(ex.mains);
    const exBoost = s => {
      const r = ex.keys.get(s.phase + '|' + (s.phase === 'vaje' ? drillKey(s.fingerprint) : s.fingerprint));
      if (r) return 1 + (r - 6) * 0.5;
      if (s.phase !== 'glavna' || !likedMains.some(m => likeStructure(s.text, m))) return 1;
      return s.meters <= (settings.example_main_max[lk] || Infinity) ? 1.5 : 1.1;
    };
    const recencyWeight = memo((s) => {
      const d = lastUseDays(history, s.fingerprint, lk, s.phase, date);
      return (d === null ? 40 : Math.min(d, 60) + 1) * exBoost(s);
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
    // C pred glavno potrebuje več vaj (v zvezku 3–5 serij, okrog 650 m) in krajšo glavno (okrog 300 m).
    // A praviloma dve seriji vaj (določeno enkrat na predlog, da metri ne silijo k tretji).
    const vajeRange = lk === 'C' ? [3, 5] : rng() < settings.three_drills_chance ? [3, 3] : [2, 2];
    const splitMemo = new Map();
    const splitCount = vs => {
      const k = vs.map(v => v.fingerprint).join('|');
      if (!splitMemo.has(k)) splitMemo.set(k, splitStrokes(orderDrills(vs).map(v => v.text)).length);
      return splitMemo.get(k);
    };
    // Vaje brez plavutk (razen prsnih ipd.) so v zvezku izjema.
    const vajeWeight = memo(v => drillWeight(v, history, lk, date, settings) * exBoost(v) * (needsFins(v.text) ? 0.2 : 1));
    const maxM = memo(x => x ? maxMeters(x.text) : 0);
    const warmDays = memo(w => lastUseDays(history, w.fingerprint, lk, 'ogrevalna', date));

    // »Nov predlog«: prejšnje glavne serije ne ponudi znova, če obstaja druga.
    if (opts.avoid && opts.avoid.length) {
      const alt = mains.filter(s => !opts.avoid.includes(s.fingerprint));
      if (alt.length) mains = alt;
    }

    // Nove serije: opts.newSets = 'brez' | 'ena' | 'vse'. Izbrane so vnaprej, da se metri izidejo.
    const newMode = opts.newSets || 'brez';
    const wantSprint = mode === 'sprint' || (mains.length > 0 && mains.every(s => isSprintMain(s, settings)));
    const noSprint = mode === 'ne_sprint' || (mode === 'auto' && sprintDays !== null && sprintDays < settings.sprint_min_gap_days);
    const needNewSprint = mode === 'sprint' && !mains.length;
    const needNew50 = joint && !mains.length;
    if (joint) notes.unshift('Skupni trening A+B: glavna serija samo iz 50 m.');
    const newPhases = (needNewSprint || needNew50) && newMode !== 'vse' ? ['glavna'] : newMode === 'vse' ? ['ogrevalna', 'vaje', 'glavna']
      : newMode === 'ena' ? [['ogrevalna', 'vaje', 'vaje', 'glavna'][Math.floor(rng() * 4)]] : [];
    const fresh = {};
    newPhases.forEach(p => {
      const n = suggestNewSet(p, { level: lk, library: opts.library, drills: opts.drills, history, dict: opts.dict, rng, settings, date, others: Object.values(fresh).map(x => x.text), sprint: p === 'glavna' && wantSprint, only50: joint && p === 'glavna', exampleMains: ex.mains, exampleLong: ex.longMains });
      if (n) fresh[p] = n;
    });
    if (needNewSprint && !fresh.glavna) {
      mains = byPhase('glavna').filter(s => mainAvailability(s, history, lk, date, settings).ok && (!joint || (onlyFifties(s.text) && s.meters <= jointMainMax)));
      notes.push('Šprinterske serije za ta nivo ni, zato je glavna navadna.');
    }

    let best = null;
    for (let attempt = 0; attempt < 400; attempt++) {
      const main = fresh.glavna || (mains.length ? weightedPick(mains, recencyWeight, rng) : null);
      const warm = fresh.ogrevalna || (ogr.length ? weightedPick(ogr, recencyWeight, rng) : null);
      // Tri serije pri A samo, če se z njimi izidejo metri.
      const nV = lk !== 'C' && vajeRange[0] === 3 && rng() < 0.3 ? 2 : vajeRange[0] + Math.floor(rng() * (vajeRange[1] - vajeRange[0] + 1));
      const chosen = new Set();
      const vs = fresh.vaje ? [fresh.vaje] : [];
      const keys = new Set(vs.map(v => drillKey(v.fingerprint)));
      const take = pool => {
        const v = weightedPick(pool, vajeWeight, rng, chosen);
        if (!v) return false;
        chosen.add(v);
        if (keys.has(drillKey(v.fingerprint))) return true; // ista vaja v drugem formatu
        if (exclusiveConflict(v.text, vs.map(x => x.text), settings)) return true;
        if (isApnea(v.text) && apneaRepeat(texts().concat(v.text), history, lk)) return true;
        keys.add(drillKey(v.fingerprint));
        vs.push(v);
        return true;
      };
      const isC = lk === 'C';
      // texts je uporabljen že v take(), zato je definiran pred zanko.
      const texts = () => [warm, main].concat(vs).filter(Boolean).map(x => x.text);
      let guard = 0;
      while (guard++ < 40) {
        const need = isC ? legsWithoutDrills(texts()) : [];
        if (need.length && vs.length < nV + 2) {
          // Vaja za tehniko, za katero so v treningu noge, in ki ne doda novih nog brez vaj.
          if (take(vaje.filter(v => strokeUse(v.text).drills.has(need[0]) && legsWithoutDrills(texts().concat(v.text)).length < need.length))) continue;
        }
        if (vs.length >= nV || need.length) break;
        if (!take(vaje)) break;
      }
      // Kratka glavna serija (npr. SIMULATOR) dobi stransko serijo v zaključku.
      const shortMain = main && main.meters < (isC ? 300 : 600);
      let z = zak.length && rng() < (shortMain ? 0.85 : 0.35) ? weightedPick(zak, recencyWeight, rng) : null;
      if (z && isC && legsWithoutDrills(texts().concat(z.text)).length) z = null;
      if (z && isApnea(z.text) && apneaRepeat(texts().concat(z.text), history, lk)) z = null;
      const fin = rng() < 0.5 ? 50 : 100;
      const total = lv.warmup_m + (warm ? warm.meters : 0) + vs.reduce((a, v) => a + v.meters, 0) + 50 +
        (main ? main.meters : 0) + (z ? z.meters : 0) + fin;
      let score = Math.abs(total - mid) / 50;
      if (total < lv.meters_min) score += (lv.meters_min - total) / 10;
      if (total > lv.meters_max) score += (total - lv.meters_max) / (joint ? 3 : 10);
      // Glavna serija naj nosi trening: vsaj ~30 % metrov in ne manj kot vse vaje skupaj.
      if (lk !== 'C' && nV < vajeRange[0]) score += 3;
      const vajeM = vs.reduce((a, v) => a + v.meters, 0);
      const block = main ? main.meters + (shortMain && z ? z.meters : 0) : 0;
      if (isC) {
        if (vajeM < 500) score += (500 - vajeM) / 25;
        if (main && main.meters > 350) score += (main.meters - 350) / 25;
      } else {
        if (main && block < 0.3 * total) score += 6;
        if (main && vajeM > block) score += 4;
      }
      // V vaje ene tehnike naj se ne vriva vaja druge tehnike.
      if (score < (best ? best.score : Infinity)) score += 5 * splitCount(vs);
      // 6x50 in drugi redki formati ter več vaj v istem formatu naj bodo izjema.
      const fmts = vs.map(v => setFormat(v.text));
      const fw = settings.vaje_format_weights || {};
      fmts.forEach(f => { if (fw[f] != null && fw[f] < 0.5) score += 0.7; });
      score += fmts.length - new Set(fmts).size;
      if (warm) { const d = warmDays(warm); if (d !== null && d < 14) score += 3; }
      if (isC && legsWithoutDrills(texts()).length) score += 60;
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
      const t = text || (phase === 'glavna' ? (joint ? stripTargets(set.text) : addTargets(set.text, lk, settings)) : set.text);
      return { phase, text: t, set_id: set && set.source === 'db' ? set.id : null, source: set ? set.source : 'fiksno', main_type: set ? set.main_type : null, isNew: !!(set && set.isNew) };
    };
    const items = { warm: [], vaje: [], main: [], zak: [] };
    if (best && best.warm) items.warm.push(mk('ogrevalna', best.warm));
    if (best) orderDrills(best.vs).forEach(v => items.vaje.push(mk('vaje', v)));
    if (best && best.main) items.main.push(mk('glavna', best.main));
    if (best && best.z) items.zak.push(mk('zakljucek', best.z));

    const list = [mk('razplavanje', null, `${lv.warmup_m} RAZP`)].concat(items.warm);
    if (order === 'glavna_takoj') {
      list.push(...items.main, mk('vmesno_razplavanje', null, '50 RAZP'), ...items.vaje);
    } else {
      list.push(...items.vaje, mk('vmesno_razplavanje', null, '50 RAZP'), ...items.main);
    }
    list.push(...items.zak, mk('zakljucno_razplavanje', null, `${best ? best.fin : 50} RAZP`));

    // Na skupnem treningu plavata A in B isto.
    if (levels.includes('B') && !joint) {
      list.forEach(it => {
        if (it.phase === 'glavna') {
          const b = bVariant(it.text, settings);
          it.variantB = b.text;
          it.variantBNote = b.note;
        }
      });
    }
    return { date, levels, joint, order_variant: order, items: list, notes };
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
    buildDict, parseLine, parseText, toStructure, normalizeText, fingerprint, stripTargets, addTargets, bVariant,
    estimateMinutes, parseTime, formatTime, libraryFromTrainings, generateTraining, arrangeOrder,
    weekSlots, historyFromTraining, historyLevel, lastUseDays, lastDrillDays, drillKey, setFormat,
    availableDrills, drillWeight, suggestNewSet, onlyFifties, jointStatus, jointLevel, apneaKinds, isApnea, apneaRepeat, apneaPairUsed, weeklyOnceUsed, weekRuleIssues, invalidDrill, needsFins, withFins, needsFins, withFins, lineRole, likeStructure, likeMain, exampleSets, EXAMPLE_MAINS, drillStrokes, splitStrokes, orderDrills, exclusiveConflict, exclusiveTooSoon, lastExclusiveDays, tidyText, unevenSides, strokeUse, legsWithoutDrills, maxMeters, longestMaxLine, overMaxDistance, isSprintTexts, isSprintMain, addDays, daysBetween, weekday, mulberry32
  };
});
