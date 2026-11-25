// Podstran Treningi: sestavljanje, shranjeni treningi, knjižnica, šifrant.
(function () {
  'use strict';
  const C = window.TreningiCore;
  const auth = window.trainerAuth;
  let sb = null;

  const S = {
    trainer: null,
    settings: C.DEFAULT_SETTINGS,
    codes: [],
    dict: new Map(),
    terms: [],
    dbSets: [],
    dbTrainings: [],
    zvezek: null,           // { sets, history, trainings } iz treningi_uvoz/zvezek_2026.json
    zvezekPending: [],      // treningi iz zvezka, ki še niso v bazi
    library: [],
    history: [],
    week: null,             // ponedeljek ISO
    cards: new Map()        // ključ slota -> stanje kartice
  };

  // ---------- Pomožne ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const DAYS = ['', 'Ponedeljek', 'Torek', 'Sreda', 'Četrtek', 'Petek', 'Sobota', 'Nedelja'];
  const fmtDate = (iso) => { const [y, m, d] = iso.split('-'); return `${+d}. ${+m}. ${y}`; };
  const slotKey = (date, levels) => date + '|' + levels.slice().sort().join('');
  const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  function mondayOf(iso) { return C.addDays(iso, 1 - C.weekday(iso)); }
  function nextMonday() { const t = todayIso(); return C.weekday(t) === 1 ? t : C.addDays(mondayOf(t), 7); }

  function banner(msg, warn) {
    const b = $('statusBanner');
    if (!msg) { b.hidden = true; return; }
    b.hidden = false; b.className = 'tr-banner' + (warn ? ' warn' : ''); b.textContent = msg;
  }

  function autoSize(ta) { ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; }

  // ---------- Nalaganje ----------
  async function init() {
    if (typeof redirectRecoveryToResetPage === 'function' && redirectRecoveryToResetPage()) return;
    const ctx = await auth.restoreSession();
    if (!ctx) {
      window.location.href = 'login.html?return=' + encodeURIComponent('treningi.html' + window.location.search);
      return;
    }
    sb = auth.supabase;
    S.trainer = ctx.trainer;
    $('authUserLabel').textContent = auth.getDisplayName() || ctx.trainer.email;
    $('authRoleBadge').textContent = ctx.permissions?.label || 'Trener';
    $('logoutBtn').addEventListener('click', async () => { await auth.logout(); window.location.href = 'login.html'; });

    setupTabs();
    setupSestavi();
    setupLibraryForm();
    banner('Nalaganje knjižnice …');
    try {
      await loadAll();
      banner(null);
      await startQuick();
    } catch (e) {
      console.error(e);
      banner('Napaka pri nalaganju: ' + (e.message || e), true);
    }
    renderWeek();
    renderSaved();
    renderLibrary();
    renderCodes();
    renderDrills();
  }

  // Supabase vrne največ 1000 vrstic na zahtevo, zato beremo po straneh. Poizvedba mora imeti enoličen vrstni red.
  const PAGE = 1000;
  async function allRows(query) {
    const data = [];
    for (;;) {
      const r = await query().range(data.length, data.length + PAGE - 1);
      if (r.error) return r;
      const rows = r.data || [];
      data.push(...rows);
      if (rows.length < PAGE) return { data, error: null };
    }
  }

  async function fetchZvezek() {
    try {
      const res = await fetch('treningi_uvoz/zvezek_2026.json');
      if (res.ok) return { trainings: (await res.json()).trainings };
    } catch (e) { console.warn('Zvezek ni na voljo:', e); }
    return null;
  }

  async function loadAll() {
    const tid = S.trainer.id;
    const zvezek = S.zvezek ? null : fetchZvezek();
    const [codesR, setR, termsR, setsR, trR, drR] = await Promise.all([
      sb.from('training_codes').select('*').eq('active', true).order('category').order('code'),
      sb.from('training_settings').select('settings').eq('trainer_id', tid).maybeSingle(),
      auth.ownTermIds.size ? sb.from('terms').select('*').in('id', Array.from(auth.ownTermIds)) : Promise.resolve({ data: [] }),
      allRows(() => sb.from('training_sets').select('id, phase, main_type, levels, text, meters, fingerprint, source, active').eq('trainer_id', tid).eq('active', true).order('id')),
      allRows(() => sb.from('trainings').select('id, term_id, date, levels, status, order_variant, total_meters, notes, rating, liked_phases, rating_note, training_items(id, position, phase, set_id, text, meters, fingerprint, level_variants, notes)').eq('trainer_id', tid).order('date', { ascending: false }).order('id')),
      sb.from('training_drill_suggestions').select('*').eq('trainer_id', tid).eq('status', 'predlog').order('created_at')
    ]);
    // Brez predlogov stran deluje naprej.
    if (drR.error) console.warn('Predlogi vaj niso na voljo:', drR.error.message);
    S.drillSuggestions = drR.data || [];
    for (const r of [codesR, setR, termsR, setsR, trR]) if (r.error) throw r.error;
    S.codes = codesR.data || [];
    S.dict = C.buildDict(S.codes, true);
    const st = (setR.data && setR.data.settings) || {};
    S.settings = Object.assign({}, C.DEFAULT_SETTINGS, st, { levels: Object.assign({}, C.DEFAULT_SETTINGS.levels, st.levels || {}) });
    S.terms = termsR.data || [];
    // Odtis brez ciljnih časov (starejše vrstice ga imajo shranjenega s časi).
    S.dbSets = (setsR.data || []).map(s => Object.assign({}, s, { source: 'db', origin: s.source, fingerprint: C.stripTargets(s.fingerprint) }));
    S.dbTrainings = trR.data || [];

    if (zvezek) S.zvezek = await zvezek;
    rebuildLibrary();
  }

  const OC = window.TreningOcena;
  /** Zgledi: treningi z oceno 8 ali več. */
  function rebuildExamples() {
    S.examples = S.dbTrainings.filter(OC.isExample).map(t => ({
      date: t.date, level: C.historyLevel(t.levels), rating: t.rating, liked: t.liked_phases || [],
      items: (t.training_items || []).map(i => ({ phase: i.phase, text: i.text }))
    }));
  }

  function rebuildLibrary() {
    const lib = S.dbSets.slice();
    const have = new Set(lib.map(s => s.phase + '|' + s.fingerprint));
    // Treningi iz zvezka, ki še niso v bazi, dopolnijo knjižnico in zgodovino.
    const inDb = new Set(S.dbTrainings.map(t => slotKey(t.date, t.levels)));
    S.zvezekPending = S.zvezek ? S.zvezek.trainings.filter(t => !inDb.has(slotKey(t.date, t.levels))) : [];
    const pend = C.libraryFromTrainings(S.zvezekPending, S.dict);
    pend.sets.forEach(s => { if (!have.has(s.phase + '|' + s.fingerprint)) lib.push(s); });
    S.library = lib;
    const hist = [];
    S.dbTrainings.forEach(t => {
      const lvl = C.historyLevel(t.levels);
      const sprint = C.isSprintTexts((t.training_items || []).map(i => i.text), S.settings);
      (t.training_items || []).forEach(i => hist.push({ date: t.date, level: lvl, phase: i.phase, fingerprint: C.stripTargets(i.fingerprint), main_type: i.phase === 'glavna' && sprint ? 'sprint' : null, status: t.status }));
    });
    hist.push(...pend.history);
    S.history = hist;
    rebuildExamples();
    renderReminder();
  }

  function mainTypeOf(item) {
    if (item.phase !== 'glavna') return null;
    if (isNewItem(item)) return newTypeOf(item);
    const s = S.dbSets.find(x => x.id === item.set_id) || S.dbSets.find(x => x.phase === 'glavna' && x.fingerprint === C.stripTargets(item.fingerprint));
    return s ? s.main_type : null;
  }

  // ---------- Zavihki ----------
  const tabHidden = (tab) => $('panel-' + tab).hidden;
  const TAB_RENDER = { shranjeni: () => renderSaved(), knjiznica: () => renderLibrary(), sifrant: () => renderCodes(), predlogi: () => renderDrills() };

  function setupTabs() {
    document.querySelectorAll('.tr-tab').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.tr-tab').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tr-panel').forEach(p => { p.hidden = p.id !== 'panel-' + btn.dataset.tab; });
      if (TAB_RENDER[btn.dataset.tab]) TAB_RENDER[btn.dataset.tab]();
    }));
  }

  // ---------- Sestavi ----------
  function setupSestavi() {
    const fromUrl = new URLSearchParams(window.location.search).get('datum');
    S.week = fromUrl && /^\d{4}-\d{2}-\d{2}$/.test(fromUrl) ? mondayOf(fromUrl) : nextMonday();
    const wd = $('weekDate');
    wd.value = S.week;
    wd.addEventListener('change', () => { if (wd.value) { S.week = mondayOf(wd.value); wd.value = S.week; renderWeek(); } });
    $('weekPrev').addEventListener('click', () => { S.week = C.addDays(S.week, -7); wd.value = S.week; renderWeek(); });
    $('weekNext').addEventListener('click', () => { S.week = C.addDays(S.week, 7); wd.value = S.week; renderWeek(); });
    $('proposeWeekBtn').addEventListener('click', () => proposeWeek());
    const nm = $('newSetsMode');
    try { nm.value = localStorage.getItem('eklub_nove_serije') || 'ena'; } catch (e) { nm.value = 'ena'; }
    nm.addEventListener('change', () => { try { localStorage.setItem('eklub_nove_serije', nm.value); } catch (e) { /* zasebni način */ } });
  }

  function slotsForWeek() {
    if (S.quick) return S.quick.groups.map(levels => ({ date: S.quick.date, term_id: S.quick.term.id, term_label: S.quick.term.label || S.quick.term.id, levels: levels.slice() }));
    return C.weekSlots(S.week, S.terms, S.settings);
  }

  // ---------- Hitri predlog (iz koledarja: ?datum=…&termin=…&hitro=1) ----------
  const QUICK_LEVELS = [['A+B', [['A', 'B']]], ['A', [['A']]], ['C', [['C']]], ['A in C', [['A'], ['C']]], ['A+B in C', [['A', 'B'], ['C']]]];

  async function startQuick() {
    const q = new URLSearchParams(window.location.search);
    const date = q.get('datum'), termId = q.get('termin');
    if (q.get('hitro') !== '1' || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !termId) return;
    let term = S.terms.find(t => t.id === termId);
    if (!term) {
      // Nadomeščanje: termin drugega trenerja.
      const { data, error } = await sb.from('terms').select('*').eq('id', termId).maybeSingle();
      if (error || !data) { banner('Termina ne najdem, prikazan je cel teden.', true); return; }
      term = data;
    }
    const wd = C.weekday(date);
    const groups = S.settings.day_levels[wd] || S.settings.day_levels[String(wd)] || [['A', 'B']];
    S.quick = { date, term, groups };
    document.body.classList.add('quick');
    // Na bazenu brez nepregledanih novih serij (★ pri vrstici je še vedno na voljo).
    $('newSetsMode').value = 'brez';
    proposeMissing();
    renderQuickBar();
  }

  function proposeMissing() {
    slotsForWeek().forEach(slot => {
      const key = slotKey(slot.date, slot.levels);
      if (!savedFor(slot) && !S.cards.has(key)) S.cards.set(key, propose(slot));
    });
  }

  function renderQuickBar() {
    const bar = $('quickBar');
    if (!S.quick) { bar.hidden = true; return; }
    const cur = JSON.stringify(S.quick.groups);
    bar.hidden = false;
    bar.innerHTML = `<div class="tr-quick"><strong>⚡ Hitri predlog</strong>
      <label class="tr-sub">Nivoji <select id="quickLevels">${QUICK_LEVELS.map(([n, g], i) => `<option value="${i}"${JSON.stringify(g) === cur ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
      <button class="btn" id="quickAgain">Drug predlog</button>
      <button class="btn" id="quickWeek">Cel teden</button>
      <a class="btn" href="index.html">← Koledar</a></div>`;
    $('quickLevels').addEventListener('change', (e) => {
      S.cards.forEach((card, k) => { if (!card.dbId && card.slot.date === S.quick.date) S.cards.delete(k); });
      S.quick.groups = QUICK_LEVELS[+e.target.value][1];
      proposeMissing(); renderWeek();
    });
    $('quickAgain').addEventListener('click', () => {
      slotsForWeek().forEach(slot => {
        if (savedFor(slot)) return;
        const key = slotKey(slot.date, slot.levels);
        const avoid = mainPrints(S.cards.get(key));
        S.cards.delete(key);
        S.cards.set(key, propose(slot, 'auto', avoid));
      });
      renderWeek();
    });
    $('quickWeek').addEventListener('click', () => {
      const date = S.quick.date;
      S.quick = null;
      document.body.classList.remove('quick');
      S.week = mondayOf(date); $('weekDate').value = S.week;
      renderQuickBar(); renderWeek();
    });
  }

  function savedFor(slot) {
    return S.dbTrainings.find(t => t.date === slot.date && t.levels.slice().sort().join('') === slot.levels.slice().sort().join(''));
  }

  // Nepregledana nova serija je v bazi označena v training_items.notes: "nova", "nova:sprint", "nova|opis".
  function isNewItem(i) { return /^nova(:|\||$)/.test(i.notes || ''); }
  function newTypeOf(i) { return /^nova:sprint/.test(i.notes || '') ? 'sprint' : null; }
  function newNoteOf(i) { const n = i.notes || ''; return isNewItem(i) && n.includes('|') ? n.slice(n.indexOf('|') + 1) : ''; }
  function newMarker(it) { return 'nova' + (it.main_type === 'sprint' ? ':sprint' : '') + (it.newNote ? '|' + it.newNote : ''); }

  function cardFromDb(t, slot) {
    const items = (t.training_items || []).slice().sort((a, b) => a.position - b.position).map(i => ({
      id: i.id, savedText: i.text, isNew: isNewItem(i), newNote: newNoteOf(i),
      phase: i.phase, text: i.text, set_id: i.set_id, source: isNewItem(i) ? 'nova' : 'db', main_type: mainTypeOf(i) || newTypeOf(i),
      variantB: i.level_variants && i.level_variants.B ? i.level_variants.B.text : undefined
    }));
    return { slot, dbId: t.id, status: t.status, order_variant: t.order_variant, items, notes: [], dirty: false, joint: isJointNote(t.notes), dbNotes: t.notes };
  }

  // Zgodovina brez treninga v tem slotu (da se predlog ne primerja sam s sabo) + ostali predlogi tedna.
  function historyExcluding(slot) {
    const key = slotKey(slot.date, slot.levels);
    const base = S.history.filter(h => !(h.date === slot.date && h.level === C.historyLevel(slot.levels) && S.dbTrainings.some(t => slotKey(t.date, t.levels) === key && t.date === h.date)));
    S.cards.forEach((card, k) => {
      if (k === key || card.dbId) return;
      base.push(...C.historyFromTraining({ date: card.slot.date, levels: card.slot.levels, items: card.items }));
    });
    return base;
  }

  const mainPrints = (card) => (card ? card.items.filter(i => i.phase === 'glavna').map(i => C.fingerprint(i.text)) : []);

  // Skupni trening je v bazi označen v trainings.notes ("SKUPNI", pred morebitno opombo).
  const isJointNote = (n) => /^SKUPNI\b/.test(n || '');
  const jointNote = (on, old) => { const rest = String(old || '').replace(/^SKUPNI(?: · )?/, ''); return on ? (rest ? 'SKUPNI · ' + rest : 'SKUPNI') : (rest || null); };
  const withB = (card, it) => card.slot.levels.includes('B') && !card.joint && it.phase === 'glavna';
  /** Datumi skupnih treningov: shranjeni in še neshranjeni predlogi, brez danega termina. */
  function jointDates(slot) {
    const key = slotKey(slot.date, slot.levels);
    const out = [];
    S.dbTrainings.forEach(t => { const k = slotKey(t.date, t.levels); const c = S.cards.get(k); if (k !== key && (c ? c.joint : isJointNote(t.notes))) out.push(t.date); });
    S.cards.forEach((c, k) => { if (k !== key && c.joint && !c.dbId) out.push(c.slot.date); });
    return out;
  }
  const jointInfo = (slot) => C.jointStatus(slot.date, slot.levels, jointDates(slot), S.settings);

  function propose(slot, mainMode, avoid, joint) {
    if (joint == null) joint = jointInfo(slot).due;
    const tr = C.generateTraining({
      date: slot.date, levels: slot.levels, library: S.library, history: historyExcluding(slot),
      settings: S.settings, seed: Math.floor(Math.random() * 1e9), mainMode: mainMode || 'auto',
      newSets: $('newSetsMode').value, dict: S.dict, drills: S.codes, avoid: avoid || [], joint, examples: S.examples
    });
    return { slot, dbId: null, status: 'predlog', order_variant: tr.order_variant, items: tr.items, notes: tr.notes, dirty: true, joint, mainMode: mainMode || 'auto' };
  }

  function proposeWeek() {
    const slots = slotsForWeek();
    if (!slots.length) { banner('Za ta teden ni tvojih terminov (pon, sre, čet).', true); return; }
    slots.forEach(slot => {
      const key = slotKey(slot.date, slot.levels);
      if (savedFor(slot)) return;
      S.cards.set(key, propose(slot));
    });
    renderWeek();
  }

  function renderWeek() {
    const view = $('weekView');
    const slots = slotsForWeek();
    if (!S.terms.length && !S.quick) {
      view.innerHTML = '<p class="tr-empty">Nimaš dodeljenih terminov (trainer_terms).</p>';
      return;
    }
    if (!slots.length) { view.innerHTML = '<p class="tr-empty">V tem tednu ni terminov.</p>'; return; }
    // Kartice iz baze (če obstajajo in niso lokalno spremenjene).
    slots.forEach(slot => {
      const key = slotKey(slot.date, slot.levels);
      const saved = savedFor(slot);
      const card = S.cards.get(key);
      if (saved && (!card || (!card.dirty && card.dbId === saved.id) || !card.dbId && !card.dirty)) S.cards.set(key, cardFromDb(saved, slot));
    });
    const byDate = new Map();
    slots.forEach(s => { if (!byDate.has(s.date)) byDate.set(s.date, []); byDate.get(s.date).push(s); });
    view.innerHTML = '';
    byDate.forEach((list, date) => {
      const day = document.createElement('div');
      day.className = 'tr-day';
      day.innerHTML = `<h2>${DAYS[C.weekday(date)]}, ${fmtDate(date)} <span class="tr-sub">${esc(list[0].term_label)}</span></h2><div class="tr-cards"></div>`;
      const cards = day.querySelector('.tr-cards');
      list.forEach(slot => cards.appendChild(renderCard(slot)));
      view.appendChild(day);
    });
  }

  function levelKey(levels) { return C.historyLevel(levels); }

  /** 200 -> "0.2", 1250 -> "1.25", 2000 -> "2.0" (kot v zvezku). */
  const km = (m) => { const t = String(Math.round(m) / 1000); return t.includes('.') ? t : t + '.0'; };

  /** Pod dolžino vsake serije: koliko je odplavano do konca te serije (km). */
  function updateRunning(el, card) {
    let soFar = 0;
    el.querySelectorAll('.tr-items > .tr-item').forEach((row, i) => {
      if (!card.items[i]) return;
      soFar += C.parseText(card.items[i].text, S.dict).meters;
      row.querySelector('.tr-km').textContent = km(soFar);
    });
  }

  function cardTotals(card) {
    let meters = 0, max = 0;
    card.items.forEach(it => { meters += C.parseText(it.text, S.dict).meters; max += C.maxMeters(it.text); });
    const lk = levelKey(card.slot.levels);
    const lv = S.settings.levels[lk];
    return { meters, max, sprint: max > S.settings.sprint_max_meters, minutes: C.estimateMinutes(meters, lk, S.settings), ok: meters >= lv.meters_min && meters <= lv.meters_max, lv };
  }

  function renderCard(slot) {
    const key = slotKey(slot.date, slot.levels);
    const card = S.cards.get(key);
    const el = document.createElement('div');
    el.className = 'tr-card';
    el.dataset.key = key;
    const title = slot.levels.join(' + ');
    if (!card) {
      el.innerHTML = `<div class="tr-card-head"><div><div class="tr-card-title">Nivo ${esc(title)}</div><div class="tr-sub">Še ni treninga</div></div></div>
        <button class="btn pri" data-act="propose">Predlagaj</button>`;
      el.querySelector('[data-act=propose]').addEventListener('click', () => { S.cards.set(key, propose(slot)); rerenderCard(key); });
      return el;
    }
    const tot = cardTotals(card);
    const legWarn = levelKey(slot.levels) === 'C' ? C.legsWithoutDrills(card.items.map(i => i.text)) : [];
    const split = C.splitStrokes(card.items.filter(i => i.phase === 'vaje').map(i => i.text));
    const statusLabel = card.status === 'predlog' ? 'predlog' : card.status;
    const ji = jointInfo(slot);
    const jointWarn = !card.joint ? [] : [
      ji.tooSoon ? `Skupni trening je bil ali bo že ${ji.gap} dni stran (vsaj ${Object.assign({}, C.DEFAULT_SETTINGS.joint, S.settings.joint || {}).min_gap_days}).` : '',
      ji.sameMonth ? 'V tem mesecu je skupni trening že določen.' : '',
      card.items.some(i => i.phase === 'glavna' && i.text.trim() && !C.onlyFifties(i.text)) ? 'Glavna serija ni samo iz 50 m.' : ''].filter(Boolean);
    el.innerHTML = `
      <div class="tr-card-head">
        <div><div class="tr-card-title">Nivo ${esc(title)}${card.joint ? ' · skupni trening' : ''}</div>
          <div class="tr-sub">${esc(DAYS[C.weekday(slot.date)])} ${fmtDate(slot.date)}</div></div>
        <div><span class="tr-badge ${esc(card.status)}">${esc(statusLabel)}</span>${card.dirty && card.dbId ? ' <span class="tr-badge">neshranjeno</span>' : ''}</div>
      </div>
      ${card.notes && card.notes.length ? `<div class="tr-chips">${card.notes.map(n => `<span class="tr-chip info">${esc(n)}</span>`).join('')}</div>` : ''}
      ${ji.possible || card.joint ? `<label class="tr-joint"><input type="checkbox" data-act="joint"${card.joint ? ' checked' : ''}> Skupni trening A+B (glavna samo iz 50 m)</label>` : ''}
      ${jointWarn.length ? `<div class="tr-chips">${jointWarn.map(w => `<span class="tr-chip">${esc(w)}</span>`).join('')}</div>` : ''}
      ${split.length ? `<div class="tr-chips"><span class="tr-chip">Mešana serija z vajo druge tehnike, čeprav ima svojo serijo: ${split.map(x => ({ K: 'kravl', H: 'hrbtno', D: 'delfin', P: 'prsno' }[x])).join(', ')}</span></div>` : ''}
      ${legWarn.length ? `<div class="tr-chips"><span class="tr-chip">Noge brez vaj za isto tehniko: ${legWarn.map(x => ({ K: 'kravl', H: 'hrbtno', D: 'delfin', P: 'prsno' }[x])).join(', ')}</span></div>` : ''}
      <div class="tr-items"></div>
      <div class="tr-add">
        <select>${C.PHASES.map(p => `<option value="${p}">${esc(C.PHASE_LABELS[p])}</option>`).join('')}</select>
        <button class="tr-ico" data-act="add">+ vrstica</button>
      </div>
      <div class="tr-foot">
        <div><span class="tr-total ${tot.ok ? 'ok' : 'bad'}">${tot.meters} m</span>
          <span class="tr-sub"> cilj ${tot.lv.meters_min}–${tot.lv.meters_max} m · ~${tot.minutes} min plavanja</span> <span class="tr-sub tr-max">· max ${tot.max} m${tot.sprint ? ' (šprint)' : ''}</span></div>
        <div class="tr-seg" title="Vrstni red">
          <button data-order="obicajni" class="${card.order_variant === 'obicajni' ? 'active' : ''}">Vaje → glavna</button>
          <button data-order="glavna_takoj" class="${card.order_variant === 'glavna_takoj' ? 'active' : ''}">Glavna takoj</button>
        </div>
        <div class="tr-btns">
          <select data-act="mode" title="Vrsta glavne serije za nov predlog" style="width:auto;margin:0">
            <option value="auto"${(card.mainMode || 'auto') === 'auto' ? ' selected' : ''}>Glavna: samodejno</option>
            <option value="ne_sprint"${card.mainMode === 'ne_sprint' ? ' selected' : ''}>Glavna: brez šprinta</option>
            <option value="sprint"${card.mainMode === 'sprint' ? ' selected' : ''}>Glavna: šprint</option>
          </select>
          <button class="btn" data-act="regen">Nov predlog</button>
          <button class="btn" data-act="draft">Shrani osnutek</button>
          <button class="btn ok" data-act="confirm">Potrdi</button>
          ${card.dbId && card.status === 'potrjen' ? '<button class="btn" data-act="done">Izveden</button>' : ''}
          <button class="btn" data-act="print">Natisni</button>
          ${card.dbId ? '<button class="btn warn" data-act="delete">Izbriši</button>' : ''}
        </div>
      </div>
      <div data-ocena hidden></div>`;
    const itemsEl = el.querySelector('.tr-items');
    card.items.forEach((it, idx) => itemsEl.appendChild(renderItem(card, it, idx, key)));
    updateRunning(el, card);

    el.querySelector('[data-act=add]').addEventListener('click', () => {
      const phase = el.querySelector('.tr-add select').value;
      card.items.push({ phase, text: '', source: 'rocno' });
      card.items = C.arrangeOrder(card.items, card.order_variant);
      card.dirty = true; rerenderCard(key);
    });
    el.querySelectorAll('[data-order]').forEach(b => b.addEventListener('click', () => {
      card.order_variant = b.dataset.order;
      card.items = C.arrangeOrder(card.items, card.order_variant);
      card.dirty = true; rerenderCard(key);
    }));
    const dbRow = card.dbId && S.dbTrainings.find(t => t.id === card.dbId);
    if (OC.canRate(dbRow)) {
      const oc = el.querySelector('[data-ocena]');
      oc.hidden = false;
      OC.render(oc, dbRow, sb, () => rebuildExamples());
    }
    const jointBox = el.querySelector('[data-act=joint]');
    if (jointBox) jointBox.addEventListener('change', () => {
      if (!card.dbId) {
        // Predlog še ni shranjen: sestavi ga na novo za skupni oziroma navadni trening.
        S.cards.set(key, propose(slot, card.mainMode, [], jointBox.checked));
      } else {
        card.joint = jointBox.checked; card.dirty = true;
        card.items.forEach(it => { if (it.phase === 'glavna') { if (card.joint) { it.variantB = undefined; it.variantBNote = ''; } else { const b = C.bVariant(it.text, S.settings); it.variantB = b.text; it.variantBNote = b.note; } } });
      }
      rerenderCard(key);
    });
    el.querySelector('[data-act=regen]').addEventListener('click', () => {
      if (card.dbId && !confirm('Trening je shranjen. Zamenjam ga z novim predlogom? (V bazi se spremeni šele ob shranjevanju.)')) return;
      const fresh = propose(slot, el.querySelector('[data-act=mode]').value, mainPrints(card), !!card.joint);
      fresh.dbId = card.dbId; fresh.dbNotes = card.dbNotes; fresh.status = card.dbId ? card.status : 'predlog';
      S.cards.set(key, fresh); rerenderCard(key);
    });
    el.querySelector('[data-act=draft]').addEventListener('click', () => saveCard(key, 'osnutek'));
    el.querySelector('[data-act=confirm]').addEventListener('click', () => saveCard(key, 'potrjen'));
    const done = el.querySelector('[data-act=done]');
    if (done) done.addEventListener('click', () => setStatus(card, 'izveden'));
    el.querySelector('[data-act=print]').addEventListener('click', () => printCard(el));
    const del = el.querySelector('[data-act=delete]');
    if (del) del.addEventListener('click', () => deleteCard(key));
    return el;
  }

  function renderItem(card, it, idx, key) {
    const wrap = document.createElement('div');
    wrap.className = 'tr-item ' + it.phase + (it.isNew ? ' je-nova' : '');
    const parsed = C.parseText(it.text, S.dict);
    let info = '';
    if (it.phase === 'glavna' && it.text.trim()) {
      const d = C.lastUseDays(S.history.filter(h => !(h.date === card.slot.date)), C.fingerprint(it.text), levelKey(card.slot.levels), 'glavna', card.slot.date);
      info = d === null ? 'še ni bila uporabljena' : `zadnjič pred ${d} dnevi`;
      if (d !== null && d < S.settings.main_repeat_days) info += ` · ⚠ manj kot ${S.settings.main_repeat_days} dni`;
      if (C.isSprintMain(it, S.settings)) info += ' · šprint';
    }
    if (it.phase === 'vaje' && it.text.trim()) {
      const d = C.lastDrillDays(S.history.filter(h => h.date !== card.slot.date), C.fingerprint(it.text), levelKey(card.slot.levels), card.slot.date);
      if (d !== null && d < S.settings.vaje_repeat_days) info = `⚠ ista vaja pred ${d} dnevi`;
      if (C.exclusiveConflict(it.text, card.items.filter(x => x !== it).map(x => x.text), S.settings)) info = '⚠ ORKA in BIONDI ne gresta skupaj';
      else {
        const ex = C.lastExclusiveDays(it.text, S.history.filter(h => h.date !== card.slot.date), levelKey(card.slot.levels), card.slot.date, S.settings);
        if (ex !== null && ex < S.settings.exclusive_gap_days) info = `⚠ ORKA/BIONDI pred ${ex} dnevi (vsaj ${S.settings.exclusive_gap_days})`;
      }
    }
    if (C.overMaxDistance(it.text, S.settings)) info = (info ? info + ' · ' : '') + `⚠ max razdalja je daljša od ${S.settings.max_distance} m`;
    wrap.innerHTML = `
      <div class="tr-item-head">
        <span class="tr-phase">${esc(C.PHASE_LABELS[it.phase])}${info ? ' · ' + esc(info) : ''}</span>
        <span class="tr-actions">
          <span><span class="tr-m">${parsed.meters} m</span><span class="tr-km" title="Skupaj do konca te serije (km)"></span></span>
          ${C.LIBRARY_PHASES.includes(it.phase) ? '<button class="tr-ico" data-a="swap" title="Zamenjaj iz knjižnice">↻</button>' : ''}
          ${['ogrevalna', 'vaje', 'glavna'].includes(it.phase) ? '<button class="tr-ico" data-a="new" title="Predlagaj povsem novo serijo">★</button>' : ''}
          <button class="tr-ico" data-a="up" title="Gor">↑</button>
          <button class="tr-ico" data-a="del" title="Odstrani">✕</button>
        </span>
      </div>
      ${it.isNew ? `<div class="tr-new"><span class="tr-badge nova">★ NOVA SERIJA – preglej</span>
        <input type="text" data-new-note placeholder="Opis ali pojasnilo (neobvezno)" value="${esc(it.newNote || '')}">
        <button class="tr-ico" data-a="approve">Serija je v redu</button></div>` : ''}
      <textarea rows="1" spellcheck="false">${esc(it.text)}</textarea>
      ${withB(card, it) ? `<div class="tr-b"><label>Nivo B</label><textarea rows="1" spellcheck="false" data-b="1">${esc(it.variantB != null ? it.variantB : it.text)}</textarea>${it.variantBNote ? `<div class="tr-sub">${esc(it.variantBNote)}</div>` : ''}</div>` : ''}
      <div class="tr-chips">${parsed.unknown.map(u => `<span class="tr-chip" title="Ni v šifrantu">${esc(u)}</span>`).join('')}${parsed.lines.some(l => l.noLength) ? '<span class="tr-chip">ni dolžine</span>' : ''}</div>`;
    const ta = wrap.querySelector('textarea:not([data-b])');
    setTimeout(() => wrap.querySelectorAll('textarea').forEach(autoSize));
    ta.addEventListener('input', () => {
      it.text = ta.value; card.dirty = true; autoSize(ta);
      const p = C.parseText(it.text, S.dict);
      wrap.querySelector('.tr-m').textContent = p.meters + ' m';
      wrap.querySelector('.tr-chips').innerHTML = p.unknown.map(u => `<span class="tr-chip">${esc(u)}</span>`).join('');
      updateTotals(key);
    });
    ta.addEventListener('change', () => {
      it.text = C.tidyText(it.text);
      if (withB(card, it)) { const b = C.bVariant(it.text, S.settings); it.variantB = b.text; it.variantBNote = b.note; }
      rerenderCard(key);
    });
    const tb = wrap.querySelector('textarea[data-b]');
    if (tb) tb.addEventListener('input', () => { it.variantB = tb.value; card.dirty = true; autoSize(tb); });
    const note = wrap.querySelector('[data-new-note]');
    if (note) note.addEventListener('input', () => { it.newNote = note.value.trim(); card.dirty = true; });
    const approve = wrap.querySelector('[data-a=approve]');
    if (approve) approve.addEventListener('click', () => approveNew(card, it, key));
    const fresh = wrap.querySelector('[data-a=new]');
    if (fresh) fresh.addEventListener('click', () => newItem(card, idx, key));
    const swap = wrap.querySelector('[data-a=swap]');
    if (swap) swap.addEventListener('click', () => swapItem(card, idx, key));
    wrap.querySelector('[data-a=up]').addEventListener('click', () => {
      if (idx === 0) return;
      [card.items[idx - 1], card.items[idx]] = [card.items[idx], card.items[idx - 1]];
      card.dirty = true; rerenderCard(key);
    });
    wrap.querySelector('[data-a=del]').addEventListener('click', () => { card.items.splice(idx, 1); card.dirty = true; rerenderCard(key); });
    return wrap;
  }

  function updateTotals(key) {
    const card = S.cards.get(key);
    const el = document.querySelector(`.tr-card[data-key="${CSS.escape(key)}"]`);
    if (!card || !el) return;
    updateRunning(el, card);
    const tot = cardTotals(card);
    const t = el.querySelector('.tr-total');
    t.textContent = tot.meters + ' m';
    t.className = 'tr-total ' + (tot.ok ? 'ok' : 'bad');
    el.querySelector('.tr-max').textContent = `· max ${tot.max} m${tot.sprint ? ' (šprint)' : ''}`;
  }

  function rerenderCard(key) {
    const card = S.cards.get(key);
    const old = document.querySelector(`.tr-card[data-key="${CSS.escape(key)}"]`);
    if (!old || !card) { renderWeek(); return; }
    old.replaceWith(renderCard(card.slot));
  }

  /** Zamenja vrstico s povsem novo serijo, ki čaka na pregled. */
  function newItem(card, idx, key) {
    const it = card.items[idx];
    const sprint = it.phase === 'glavna' && (card.mainMode === 'sprint' || (card.mainMode !== 'ne_sprint' && C.isSprintMain(it, S.settings)));
    const n = C.suggestNewSet(it.phase, {
      level: levelKey(card.slot.levels), library: S.library, history: historyExcluding(card.slot), dict: S.dict, drills: S.codes,
      exclude: card.items.map(i => C.fingerprint(i.text)), sprint, only50: !!card.joint && it.phase === 'glavna', exampleMains: C.exampleSets(S.examples, levelKey(card.slot.levels), S.settings).mains, settings: S.settings, date: card.slot.date,
      others: card.items.filter((x, j) => j !== idx).map(i => i.text)
    });
    if (!n) { alert('Za to fazo trenutno nimam nove serije.'); return; }
    if (it.phase === 'glavna' && !card.joint) n.text = C.addTargets(n.text, levelKey(card.slot.levels), S.settings);
    const next = { phase: it.phase, text: n.text, set_id: null, source: 'nova', isNew: true, main_type: n.main_type };
    if (withB(card, it)) { const b = C.bVariant(n.text, S.settings); next.variantB = b.text; next.variantBNote = b.note; }
    card.items[idx] = next;
    card.dirty = true;
    rerenderCard(key);
  }

  /** Trener potrdi novo serijo. Pri shranjenem treningu gre takoj v knjižnico, sicer ob shranjevanju. */
  async function approveNew(card, it, key) {
    if (!it.text.trim()) return;
    if (card.dbId && it.id && it.text.trim() === it.savedText) {
      try {
        const setId = await ensureSet(it, card.slot.levels.slice().sort());
        const { error } = await sb.from('training_items').update({ set_id: setId, notes: null }).eq('id', it.id);
        if (error) throw error;
        const t = S.dbTrainings.find(x => x.id === card.dbId);
        const row = t && (t.training_items || []).find(x => x.id === it.id);
        if (row) { row.notes = null; row.set_id = setId; }
        banner('Serija je potrjena in dodana v knjižnico.');
      } catch (e) { banner('Potrditev serije ni uspela: ' + (e.message || e), true); return; }
    } else {
      banner('Serija je potrjena. V knjižnico gre, ko shraniš trening.');
      card.dirty = true;
    }
    it.isNew = false;
    it.approved = true;
    rebuildLibrary(); rerenderCard(key); renderLibrary(); renderReminder();
  }

  /** Opomnik: shranjeni treningi z novimi serijami, ki še niso pregledane. */
  function renderReminder() {
    const box = $('newReminder');
    const rows = [];
    S.dbTrainings.forEach(t => {
      const n = (t.training_items || []).filter(isNewItem).length;
      if (n) rows.push({ t, n });
    });
    if (!rows.length) { box.hidden = true; box.innerHTML = ''; return; }
    rows.sort((a, b) => a.t.date.localeCompare(b.t.date));
    const total = rows.reduce((a, r) => a + r.n, 0);
    box.hidden = false;
    box.innerHTML = `<strong>★ Nove serije, ki čakajo na pregled: ${total}</strong> ` +
      rows.map(r => `<button class="tr-ico" data-open="${esc(r.t.date)}">${fmtDate(r.t.date)} ${esc(r.t.levels.join('+'))} (${r.n})</button>`).join(' ');
    box.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => {
      S.week = mondayOf(b.dataset.open); $('weekDate').value = S.week; renderWeek();
      document.querySelector('.tr-tab[data-tab=sestavi]').click();
    }));
  }

  function swapItem(card, idx, key) {
    const it = card.items[idx];
    const lk = levelKey(card.slot.levels);
    const hist = historyExcluding(card.slot);
    const used = new Set(card.items.map(i => C.fingerprint(i.text)));
    const others = card.items.filter((x, j) => j !== idx).map(i => i.text);
    let pool = S.library.filter(s => s.phase === it.phase && (s.levels || []).includes(lk) && !used.has(s.fingerprint) && !C.exclusiveConflict(s.text, others, S.settings) && !C.overMaxDistance(s.text, S.settings));
    if (it.phase === 'glavna') {
      if (card.joint) pool = pool.filter(s => C.onlyFifties(s.text));
      if (card.mainMode === 'ne_sprint') pool = pool.filter(s => !C.isSprintMain(s, S.settings));
      if (card.mainMode === 'sprint') pool = pool.filter(s => C.isSprintMain(s, S.settings));
      pool = pool.filter(s => { const d = C.lastUseDays(hist, s.fingerprint, lk, 'glavna', card.slot.date); return d === null || d >= S.settings.main_repeat_days; });
    }
    if (it.phase === 'vaje') {
      const keys = new Set(card.items.filter(i => i.phase === 'vaje').map(i => C.drillKey(C.fingerprint(i.text))));
      pool = C.availableDrills(pool, hist, lk, card.slot.date, S.settings).filter(s => !keys.has(C.drillKey(s.fingerprint)));
    }
    if (lk === 'C') {
      // Raje serija, po kateri noge ne ostanejo brez vaj za isto tehniko.
      const ok = pool.filter(s => !C.legsWithoutDrills(others.concat(s.text)).length);
      if (ok.length) pool = ok;
    }
    if (!pool.length) { alert('V knjižnici ni druge primerne serije za to fazo. Poskusi s ★ (nova serija).'); return; }
    const weight = s => { if (it.phase === 'vaje') return C.drillWeight(s, hist, lk, card.slot.date, S.settings); const d = C.lastUseDays(hist, s.fingerprint, lk, s.phase, card.slot.date); return d === null ? 40 : Math.min(d, 60) + 1; };
    const total = pool.reduce((a, s) => a + weight(s), 0);
    let r = Math.random() * total, pick = pool[0];
    for (const s of pool) { r -= weight(s); if (r <= 0) { pick = s; break; } }
    const text = it.phase !== 'glavna' ? pick.text : card.joint ? C.stripTargets(pick.text) : C.addTargets(pick.text, lk, S.settings);
    const next = { phase: it.phase, text, set_id: pick.source === 'db' ? pick.id : null, source: pick.source, main_type: pick.main_type };
    if (withB(card, it)) { const b = C.bVariant(text, S.settings); next.variantB = b.text; next.variantBNote = b.note; }
    card.items[idx] = next;
    card.dirty = true;
    rerenderCard(key);
  }

  // ---------- Shranjevanje ----------
  async function ensureSet(item, levels) {
    if (!C.LIBRARY_PHASES.includes(item.phase) || !item.text.trim()) return null;
    const fp = C.fingerprint(item.text);
    const existing = S.dbSets.find(s => s.phase === item.phase && s.fingerprint === fp);
    if (existing) return existing.id;
    const parsed = C.parseText(item.text, S.dict);
    const row = {
      trainer_id: S.trainer.id, phase: item.phase, levels, text: item.text.trim(),
      structure: C.toStructure(parsed), meters: parsed.meters, fingerprint: fp,
      main_type: item.main_type || null, source: item.source === 'zvezek' ? 'uvoz' : item.approved ? 'ai' : 'rocno',
      notes: item.newNote || null
    };
    const { data, error } = await sb.from('training_sets').upsert(row, { onConflict: 'trainer_id,phase,fingerprint' }).select().single();
    if (error) throw error;
    S.dbSets.push(Object.assign({}, data, { source: 'db', origin: data.source }));
    return data.id;
  }

  async function saveCard(key, status) {
    const card = S.cards.get(key);
    if (!card) return;
    const items = card.items.filter(i => i.text.trim());
    if (!items.length) { alert('Trening je prazen.'); return; }
    if (status === 'potrjen') {
      const lk = levelKey(card.slot.levels);
      const hist = S.history.filter(h => h.date !== card.slot.date);
      const clash = items.filter(i => i.phase === 'glavna').map(i => C.lastUseDays(hist, C.fingerprint(i.text), lk, 'glavna', card.slot.date)).find(d => d !== null && d < S.settings.main_repeat_days);
      if (clash != null && !confirm(`Glavna serija je bila uporabljena pred ${clash} dnevi. Vseeno potrdim?`)) return;
    }
    const unreviewed = items.filter(i => i.isNew);
    if (status === 'potrjen' && unreviewed.length &&
        !confirm(`Nove serije, ki jih še nisi pregledal: ${unreviewed.length}\n\n${unreviewed.map(i => C.PHASE_LABELS[i.phase] + ': ' + i.text.replace(/\n/g, ' | ')).join('\n')}\n\nVseeno potrdim trening? Serije ostanejo označene kot nove in ne gredo v knjižnico.`)) return;
    banner('Shranjujem …');
    try {
      const tot = cardTotals(card);
      const lvls = card.slot.levels.slice().sort();
      const row = {
        trainer_id: S.trainer.id, term_id: card.slot.term_id, date: card.slot.date, levels: lvls,
        status, order_variant: card.order_variant, total_meters: tot.meters, estimated_minutes: tot.minutes,
        confirmed_at: status === 'potrjen' ? new Date().toISOString() : null,
        notes: jointNote(card.joint, card.dbNotes)
      };
      let id = card.dbId;
      if (id) {
        const { error } = await sb.from('trainings').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await sb.from('trainings').insert(row).select().single();
        if (error) throw error;
        id = data.id;
      }
      const rows = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const parsed = C.parseText(it.text, S.dict);
        const setId = it.isNew ? null : await ensureSet(it, lvls);
        const lv = {};
        if (withB(card, it) && it.variantB && it.variantB.trim() !== it.text.trim()) lv.B = { text: it.variantB.trim() };
        rows.push({
          training_id: id, position: i, phase: it.phase, set_id: setId, text: it.text.trim(),
          structure: C.toStructure(parsed), meters: parsed.meters, fingerprint: C.fingerprint(it.text), level_variants: lv,
          notes: it.isNew ? newMarker(it) : null
        });
      }
      // Najprej nove vrstice, šele nato brisanje starih: napaka ne sme pustiti praznega treninga.
      const oldIds = card.dbId ? ((S.dbTrainings.find(t => t.id === id) || {}).training_items || []).map(i => i.id) : [];
      const { error: e3 } = await sb.from('training_items').insert(rows);
      if (e3) throw e3;
      if (oldIds.length) {
        const { error: e2 } = await sb.from('training_items').delete().in('id', oldIds);
        if (e2) throw e2;
      }
      await loadAll();
      const saved = S.dbTrainings.find(t => t.id === id);
      if (saved) S.cards.set(key, cardFromDb(saved, card.slot));
      banner(status === 'potrjen' ? 'Trening je potrjen in shranjen.' : 'Osnutek je shranjen.');
      renderWeek(); renderSaved(); renderLibrary();
    } catch (e) {
      console.error(e);
      banner('Shranjevanje ni uspelo: ' + (e.message || e), true);
    }
  }

  async function setStatus(card, status) {
    const { error } = await sb.from('trainings').update({ status }).eq('id', card.dbId);
    if (error) { banner('Napaka: ' + error.message, true); return; }
    await loadAll(); S.cards.delete(slotKey(card.slot.date, card.slot.levels)); renderWeek(); renderSaved();
  }

  async function deleteCard(key) {
    const card = S.cards.get(key);
    if (!card || !card.dbId) return;
    if (!confirm('Izbrišem ta trening iz baze? Serije ostanejo v knjižnici.')) return;
    const { error } = await sb.from('trainings').delete().eq('id', card.dbId);
    if (error) { banner('Brisanje ni uspelo: ' + error.message, true); return; }
    S.cards.delete(key);
    await loadAll(); renderWeek(); renderSaved();
  }

  function printCard(el) {
    document.querySelectorAll('.print-target').forEach(x => x.classList.remove('print-target'));
    el.classList.add('print-target');
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); el.classList.remove('print-target'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    window.print();
  }

  // ---------- Shranjeni ----------
  function renderSaved() {
    if (tabHidden('shranjeni')) return;
    const view = $('savedView');
    if (!S.dbTrainings.length) { view.innerHTML = '<p class="tr-empty">Ni še shranjenih treningov.</p>'; return; }
    const only = $('savedFilter').value;
    const all = S.dbTrainings.filter(t => only === 'zgledi' ? OC.isExample(t) : only === 'ocenjeni' ? t.rating : true);
    const list = all.slice(0, 120);
    const likedText = (t) => (t.liked_phases || []).map(p => (OC.PHASES.find(x => x[0] === p) || [p, p])[1].toLowerCase()).join(', ');
    view.innerHTML = list.map(t => {
      const items = (t.training_items || []).slice().sort((a, b) => a.position - b.position);
      return `<div class="tr-lib-row">
        <div class="tr-item-head"><strong>${DAYS[C.weekday(t.date)]} ${fmtDate(t.date)} · ${esc(t.levels.join('+'))}</strong>
          <span>${t.rating ? `<span class="tr-badge${OC.isExample(t) ? ' zgled' : ''}">${OC.isExample(t) ? '★ ' : ''}${t.rating}/10</span> ` : ''}<span class="tr-badge ${esc(t.status)}">${esc(t.status)}</span> <span class="tr-m">${t.total_meters || ''} m</span>
          <button class="tr-ico" data-week="${esc(t.date)}">Odpri</button></span></div>
        ${t.rating && (likedText(t) || t.rating_note) ? `<div class="tr-sub">${likedText(t) ? 'Najbolj všeč: ' + esc(likedText(t)) : ''}${likedText(t) && t.rating_note ? ' · ' : ''}${esc(t.rating_note || '')}</div>` : ''}
        <pre>${items.map(i => esc(i.text.replace(/\n/g, ' | '))).join('\n')}</pre></div>`;
    }).join('') + (all.length > list.length ? `<p class="tr-sub">Prikazanih je zadnjih ${list.length}.</p>` : '') || `<p class="tr-empty">${only === 'zgledi' ? 'Ni še treningov z oceno 8 ali več.' : 'Ni še ocenjenih treningov.'}</p>`;
    view.querySelectorAll('[data-week]').forEach(b => b.addEventListener('click', () => {
      S.week = mondayOf(b.dataset.week); $('weekDate').value = S.week; renderWeek();
      document.querySelector('.tr-tab[data-tab=sestavi]').click();
    }));
  }

  // ---------- Knjižnica ----------
  function setupLibraryForm() {
    $('savedFilter').addEventListener('input', () => renderSaved());
    $('newSetPhase').innerHTML = C.LIBRARY_PHASES.map(p => `<option value="${p}">${esc(C.PHASE_LABELS[p])}</option>`).join('');
    $('libPhase').innerHTML = '<option value="">Vse faze</option>' + C.LIBRARY_PHASES.map(p => `<option value="${p}">${esc(C.PHASE_LABELS[p])}</option>`).join('');
    ['libPhase', 'libLevel', 'libSearch'].forEach(id => $(id).addEventListener('input', renderLibrary));
    const prev = () => {
      const p = C.parseText($('newSetText').value, S.dict);
      $('newSetPreview').innerHTML = $('newSetText').value.trim()
        ? `${p.meters} m${p.unknown.length ? ' · ni v šifrantu: ' + p.unknown.map(esc).join(', ') : ''}${p.lines.some(l => l.noLength) ? ' · vrstica brez dolžine' : ''}`
        : '';
    };
    $('newSetText').addEventListener('input', prev);
    $('newSetSave').addEventListener('click', async () => {
      const text = C.tidyText($('newSetText').value.trim());
      const levels = Array.from(document.querySelectorAll('.newSetLevel:checked')).map(c => c.value);
      if (!text || !levels.length) { alert('Vpiši serijo in izberi vsaj en nivo.'); return; }
      try {
        await ensureSet({ phase: $('newSetPhase').value, text, main_type: $('newSetSprint').checked ? 'sprint' : null, source: 'rocno' }, levels);
        $('newSetText').value = ''; prev();
        rebuildLibrary(); renderLibrary();
        banner('Serija je dodana v knjižnico.');
      } catch (e) { banner('Napaka: ' + (e.message || e), true); }
    });
  }

  function renderLibrary() {
    if (tabHidden('knjiznica')) return;
    renderImportBox();
    const phase = $('libPhase').value, level = $('libLevel').value, q = $('libSearch').value.trim().toUpperCase();
    const today = todayIso();
    const rows = S.library.filter(s => (!phase || s.phase === phase) && (!level || (s.levels || []).includes(level)) && (!q || s.text.toUpperCase().includes(q)))
      .sort((a, b) => C.PHASES.indexOf(a.phase) - C.PHASES.indexOf(b.phase) || a.meters - b.meters);
    $('libCount').textContent = `${rows.length} serij`;
    $('libView').innerHTML = rows.slice(0, 300).map(s => {
      const lk = (s.levels || []).includes('A') ? 'A' : 'C';
      const d = C.lastUseDays(S.history, s.fingerprint, lk, s.phase, today);
      let avail = '';
      if (s.phase === 'glavna') {
        const last = S.history.filter(h => h.fingerprint === s.fingerprint && h.level === lk && h.phase === 'glavna').map(h => h.date).sort().pop();
        avail = last ? ` · na voljo od ${fmtDate(C.addDays(last, S.settings.main_repeat_days))}` : '';
      }
      return `<div class="tr-lib-row"><div class="tr-item-head">
        <span class="tr-phase">${esc(C.PHASE_LABELS[s.phase])} · ${esc((s.levels || []).join(', '))}${s.phase === 'glavna' && C.isSprintMain(s, S.settings) ? ' · šprint' : ''}</span>
        <span><span class="tr-badge">${s.source === 'db' ? (s.origin === 'ai' ? 'baza · predlagana' : 'baza') : 'zvezek'}</span> <span class="tr-m">${s.meters} m</span></span></div>
        <pre>${esc(s.text)}</pre>
        <div class="tr-sub">${d === null ? 'še ni bila uporabljena' : 'zadnjič pred ' + d + ' dnevi'}${avail}</div></div>`;
    }).join('') || '<p class="tr-empty">Ni zadetkov.</p>';
  }

  function renderImportBox() {
    const box = $('importBox');
    const pending = S.zvezekPending || [];
    if (!pending.length) { box.innerHTML = ''; return; }
    const ready = pending.filter(t => t.reviewed);
    box.innerHTML = `<div class="tr-banner warn">${pending.length} treningov iz zvezka 2026 <strong>še ni v bazi</strong>; njihove serije se že uporabljajo za predloge in pravilo 2 mesecev.
      ${ready.length ? `${ready.length} od njih je pregledanih in pripravljenih za uvoz (serije v knjižnico, treningi v zgodovino kot »izveden«).
      <div style="margin-top:8px"><button class="btn ok" id="importBtn">Uvozi ${ready.length} pregledanih treningov</button></div>` : 'Uvozijo se, ko jih pregledava.'}</div>`;
    const btn = $('importBtn');
    if (btn) btn.addEventListener('click', importZvezek);
  }

  async function importZvezek() {
    const ready = (S.zvezekPending || []).filter(t => t.reviewed);
    if (!ready.length) return;
    const lib = C.libraryFromTrainings(ready, S.dict);
    if (!confirm(`Uvozim ${ready.length} pregledanih treningov (${lib.sets.length} serij) iz zvezka 2026 v bazo?`)) return;
    banner('Uvažam zvezek …');
    try {
      const rows = lib.sets.map(s => {
        const parsed = C.parseText(s.text, S.dict);
        return { trainer_id: S.trainer.id, phase: s.phase, levels: s.levels.slice().sort(), text: s.text, structure: C.toStructure(parsed),
          meters: parsed.meters, fingerprint: s.fingerprint, main_type: s.main_type || null, source: 'uvoz', notes: 'zvezek 2026' };
      });
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await sb.from('training_sets').upsert(rows.slice(i, i + 100), { onConflict: 'trainer_id,phase,fingerprint', ignoreDuplicates: true });
        if (error) throw error;
      }
      const { data: sets, error: es } = await allRows(() => sb.from('training_sets').select('id, phase, fingerprint').eq('trainer_id', S.trainer.id).order('id'));
      if (es) throw es;
      const setId = new Map(sets.map(s => [s.phase + '|' + s.fingerprint, s.id]));
      const existing = new Set(S.dbTrainings.map(t => slotKey(t.date, t.levels)));
      const { data: allTerms } = await sb.from('terms').select('*').in('id', Array.from(auth.ownTermIds));
      const termFor = (date) => (allTerms || []).find(t => Number(t.day) === C.weekday(date) && (!t.date_from || t.date_from <= date) && (!t.date_to || t.date_to >= date));
      for (const t of ready) {
        if (existing.has(slotKey(t.date, t.levels))) continue;
        const term = termFor(t.date);
        const lk = C.historyLevel(t.levels);
        const { data: tr, error } = await sb.from('trainings').insert({
          trainer_id: S.trainer.id, term_id: term ? term.id : null, date: t.date, levels: t.levels.slice().sort(), status: 'izveden',
          order_variant: t.order_variant, total_meters: t.total_meters, estimated_minutes: C.estimateMinutes(t.total_meters, lk, S.settings),
          notes: 'Uvoz iz zvezka 2026'
        }).select().single();
        if (error) throw error;
        const items = t.items.map((it, i) => {
          const parsed = C.parseText(it.text, S.dict);
          const fp = C.fingerprint(it.text);
          return { training_id: tr.id, position: i, phase: it.phase, set_id: setId.get(it.phase + '|' + fp) || null, text: it.text,
            structure: C.toStructure(parsed), meters: parsed.meters, fingerprint: fp, level_variants: {} };
        });
        const { error: ei } = await sb.from('training_items').insert(items);
        if (ei) throw ei;
      }
      await loadAll();
      banner('Zvezek 2026 je uvožen.');
      renderWeek(); renderSaved(); renderLibrary();
    } catch (e) {
      console.error(e);
      banner('Uvoz ni uspel: ' + (e.message || e), true);
    }
  }

  // ---------- Predlogi vaj ----------
  function embedUrl(url) {
    let m = String(url).match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
    if (m) return 'https://www.youtube-nocookie.com/embed/' + m[1];
    m = String(url).match(/^https:\/\/vimeo\.com\/(\d+)/);
    return m ? 'https://player.vimeo.com/video/' + m[1] + '?dnt=1' : null;
  }
  const safeUrl = (u) => (/^https:\/\//.test(u || '') ? u : '#');

  function renderDrills() {
    const list = S.drillSuggestions || [];
    const cnt = $('drillCount');
    cnt.hidden = !list.length;
    cnt.textContent = list.length;
    if (tabHidden('predlogi')) return;
    const view = $('drillsView');
    if (!list.length) { view.innerHTML = '<p class="tr-empty">Trenutno ni novih predlogov.</p>'; return; }
    view.innerHTML = list.map(d => `<div class="tr-drill" data-id="${esc(d.id)}">
      <div class="tr-card-title">${esc(d.title)}</div>
      <div class="tr-sub">${esc(d.why || '')}</div>
      <div data-video>${embedUrl(d.video_url) ? '<button class="btn" data-play>▶ Pokaži video</button> ' : ''}<a href="${esc(safeUrl(d.video_url))}" target="_blank" rel="noopener noreferrer">Odpri video</a></div>
      <label>Kratica <input type="text" data-code value="${esc(d.code)}"></label>
      <label>Opis <textarea rows="3" data-desc>${esc(d.description)}</textarea></label>
      <label>Plava se
        <select data-dist><option value="">izberi …</option><option value="25">samo 25 m</option><option value="25,50">25 ali 50 m</option></select></label>
      <label>Plavutke
        <select data-fins><option value="">izberi …</option><option value="PL">s plavutkami</option><option value="BREZ PL">brez plavutk</option><option value="PL,BREZ PL">oboje (s plavutkami ali brez)</option></select></label>
      <label>Nivoji <span><input type="checkbox" value="A" data-lv checked> A+B <input type="checkbox" value="C" data-lv> C</span></label>
      <div class="tr-btns"><button class="btn ok" data-ok>Potrdi v šifrant</button> <button class="btn warn" data-no>Zavrni</button></div>
    </div>`).join('');
    view.querySelectorAll('.tr-drill').forEach(el => {
      const d = list.find(x => x.id === el.dataset.id);
      const play = el.querySelector('[data-play]');
      if (play) play.addEventListener('click', () => {
        const f = document.createElement('iframe');
        f.src = embedUrl(d.video_url);
        f.allow = 'fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        f.referrerPolicy = 'strict-origin-when-cross-origin';
        el.querySelector('[data-video]').appendChild(f);
        play.remove();
      });
      el.querySelector('[data-ok]').addEventListener('click', () => confirmDrill(d, el));
      el.querySelector('[data-no]').addEventListener('click', () => decideDrill(d, 'zavrnjen'));
    });
  }

  async function confirmDrill(d, el) {
    const code = el.querySelector('[data-code]').value.trim();
    const desc = el.querySelector('[data-desc]').value.trim();
    const dist = el.querySelector('[data-dist]').value;
    const fins = el.querySelector('[data-fins]').value;
    const levels = Array.from(el.querySelectorAll('[data-lv]:checked')).map(x => x.value).reduce((a, l) => a.concat(l === 'A' ? ['A', 'B'] : [l]), []);
    if (!code || !desc) { alert('Vpiši kratico in opis.'); return; }
    if (!dist) { alert('Izberi, ali se plava samo 25 m ali tudi 50 m.'); return; }
    if (!fins) { alert('Izberi, ali se plava s plavutkami ali brez.'); return; }
    if (!levels.length) { alert('Izberi vsaj en nivo.'); return; }
    const taken = S.codes.find(c => [c.code].concat(c.aliases || []).some(a => String(a).toUpperCase() === code.toUpperCase()));
    if (taken) { alert(`Kratica ${code} je že v šifrantu (${taken.meaning}). Izberi drugo.`); return; }
    const { error } = await sb.from('training_codes').insert({
      code, meaning: desc, category: 'vaja', stroke: d.stroke || null, explanation: d.title, video_url: d.video_url,
      distances: dist.split(',').map(Number), equipment: fins.split(','), levels, created_by: S.trainer.id
    });
    if (error) { banner('Vaja ni shranjena: ' + error.message, true); return; }
    await decideDrill(d, 'potrjen', `Vaja ${code} je v šifrantu.`);
  }

  async function decideDrill(d, status, message) {
    const { error } = await sb.from('training_drill_suggestions').update({ status, decided_at: new Date().toISOString() }).eq('id', d.id);
    if (error) { banner('Napaka: ' + error.message, true); return; }
    await loadAll();
    renderDrills(); renderCodes();
    banner(message || `Predlog ${d.title} je zavrnjen.`);
  }

  // ---------- Šifrant ----------
  const finsLabel = (c) => { const e = c.equipment || []; return e.includes('PL') && e.includes('BREZ PL') ? ' · s plavutkami ali brez' : e.includes('PL') ? ' · s plavutkami' : e.includes('BREZ PL') ? ' · brez plavutk' : ''; };
  function renderCodes() {
    if (tabHidden('sifrant')) return;
    const view = $('codesView');
    const dbKeys = new Set();
    S.codes.forEach(c => [c.code].concat(c.aliases || []).forEach(a => dbKeys.add(String(a).toUpperCase())));
    const pending = C.REVIEW_CODES.filter(c => !dbKeys.has(c.code.toUpperCase()));
    const byCat = new Map();
    S.codes.forEach(c => { if (!byCat.has(c.category)) byCat.set(c.category, []); byCat.get(c.category).push(c); });
    let html = '';
    if (pending.length) {
      html += `<div class="tr-form"><strong>Iz pregleda zvezka, še ni v bazi (${pending.length})</strong>
        <p class="tr-sub">Razčlenjevalnik jih že pozna. Z gumbom jih dodaš v šifrant v bazi.</p>
        <table class="tr-codes"><tbody>${pending.map(c => `<tr><td><strong>${esc(c.code)}</strong></td><td>${esc(c.meaning)}</td><td>${esc(c.category)}</td>
          <td><button class="tr-ico" data-add="${esc(c.code)}">Dodaj</button></td></tr>`).join('')}</tbody></table>
        <button class="btn ok" id="addAllCodes" style="margin-top:8px">Dodaj vse v šifrant</button></div>`;
    }
    byCat.forEach((list, cat) => {
      html += `<h3 style="margin:14px 0 6px">${esc(cat)}</h3><table class="tr-codes"><tbody>${list.map(c =>
        `<tr><td style="width:110px"><strong>${esc(c.code)}</strong></td><td>${esc(c.meaning)}${c.explanation ? `<div class="tr-sub">${esc(c.explanation)}</div>` : ''}${(c.distances || []).length ? `<div class="tr-sub">${c.distances.join(' / ')} m${finsLabel(c)}</div>` : ''}${c.video_url ? `<div class="tr-sub"><a href="${esc(safeUrl(c.video_url))}" target="_blank" rel="noopener noreferrer">video</a></div>` : ''}</td>
        <td class="tr-sub">${esc((c.aliases || []).join(', '))}</td></tr>`).join('')}</tbody></table>`;
    });
    view.innerHTML = html || '<p class="tr-empty">Šifrant je prazen.</p>';
    const addCodes = async (codes) => {
      const rows = codes.map(c => ({ code: c.code, meaning: c.meaning, category: c.category, created_by: S.trainer.id }));
      const { error } = await sb.from('training_codes').upsert(rows, { onConflict: 'code', ignoreDuplicates: true });
      if (error) {
        // lower(code) je unikaten indeks izraza; ob konfliktu poskusi posamično.
        for (const r of rows) { const { error: e } = await sb.from('training_codes').insert(r); if (e && !/duplicate/i.test(e.message)) { banner('Napaka: ' + e.message, true); return; } }
      }
      await loadAll(); renderCodes(); renderWeek();
      banner(`Dodano v šifrant: ${codes.map(c => c.code).join(', ')}`);
    };
    view.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => addCodes(pending.filter(c => c.code === b.dataset.add))));
    const all = $('addAllCodes');
    if (all) all.addEventListener('click', () => { if (confirm(`Dodam ${pending.length} kratic v šifrant?`)) addCodes(pending); });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
