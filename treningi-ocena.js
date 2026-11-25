// Ocena izvedenega treninga (1–10) in vidiki, ki so bili najbolj všeč. Uporabljata jo koledar in stran Treningi.
(function () {
  'use strict';
  const PHASES = [['ogrevalna', 'Ogrevalna'], ['vaje', 'Vaje'], ['glavna', 'Glavna'], ['zakljucek', 'Zaključek']];
  const EXAMPLE_MIN = 8;

  const todayIso = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
  /** Oceniti je mogoče shranjen trening, ki je danes ali je že mimo. */
  const canRate = (t) => !!t && !!t.id && t.date <= todayIso();
  const isExample = (t) => Number(t && t.rating) >= EXAMPLE_MIN;

  /**
   * Nariše ocenjevanje v box. t: vrstica treninga (id, date, rating, liked_phases, rating_note, training_items).
   * Vsaka sprememba se takoj shrani; onChange(t) se pokliče po uspešnem shranjevanju.
   */
  function render(box, t, sb, onChange) {
    const has = new Set((t.training_items || []).map(i => i.phase));
    const phases = PHASES.filter(p => !has.size || has.has(p[0]));
    box.classList.add('oc');
    box.innerHTML = `<div class="oc-head"><strong>Ocena treninga</strong> <span class="oc-state" aria-live="polite"></span></div>
      <div class="oc-nums" role="group" aria-label="Ocena od 1 do 10">${Array.from({ length: 10 }, (_, i) => `<button type="button" data-n="${i + 1}">${i + 1}</button>`).join('')}</div>
      <div class="oc-more"><span>Najbolj všeč:</span> ${phases.map(p => `<button type="button" data-p="${p[0]}">${p[1]}</button>`).join('')}
        <input type="text" maxlength="500" placeholder="Opomba (neobvezno)" aria-label="Opomba k oceni"></div>`;
    const state = box.querySelector('.oc-state'), more = box.querySelector('.oc-more'), note = box.querySelector('input');
    note.value = t.rating_note || '';
    let saving = Promise.resolve();

    function paint() {
      const r = Number(t.rating) || 0, liked = t.liked_phases || [];
      box.querySelectorAll('[data-n]').forEach(b => { const on = +b.dataset.n === r; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      box.querySelectorAll('[data-p]').forEach(b => { const on = liked.includes(b.dataset.p); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      more.hidden = !r;
      box.classList.toggle('zgled', isExample(t));
      if (state.dataset.err !== '1') state.textContent = isExample(t) ? '★ zgled' : '';
    }
    /** Shrani eno spremembo za drugo, da se hitri kliki ne prehitijo. */
    function save(patch) {
      const before = {};
      Object.keys(patch).forEach(k => { before[k] = t[k]; });
      Object.assign(t, patch);
      state.dataset.err = '';
      paint();
      saving = saving.then(async () => {
        let error = null;
        try {
          const r = await sb.from('trainings').update(Object.assign({ rated_at: t.rating ? new Date().toISOString() : null }, patch)).eq('id', t.id).select('id');
          error = r.error || (r.data && r.data.length === 1 ? null : { message: 'trening ni bil najden' });
        } catch (e) { error = e; }
        if (error) {
          Object.keys(patch).forEach(k => { if (t[k] === patch[k]) t[k] = before[k]; });
          state.dataset.err = '1';
          state.textContent = 'Ni shranjeno: ' + (error.message || error);
        } else {
          state.textContent = isExample(t) ? '✓ shranjeno · ★ zgled' : '✓ shranjeno';
          if (onChange) onChange(t);
        }
        paint2();
      });
    }
    // Po shranjevanju osveži gumbe, sporočilo pa pusti.
    function paint2() { const s = state.textContent; paint(); state.textContent = s; }

    box.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => {
      const n = +b.dataset.n;
      if (Number(t.rating) === n) save({ rating: null, liked_phases: [], rating_note: null });
      else save({ rating: n });
      if (!t.rating) note.value = '';
    }));
    box.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
      const liked = t.liked_phases || [];
      save({ liked_phases: liked.includes(b.dataset.p) ? liked.filter(x => x !== b.dataset.p) : liked.concat(b.dataset.p) });
    }));
    note.addEventListener('change', () => save({ rating_note: note.value.trim() || null }));
    paint();
  }

  window.TreningOcena = { render, canRate, isExample, EXAMPLE_MIN, PHASES };
})();
