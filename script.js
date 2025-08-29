// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Konfiguracija Supabase
    const supabaseUrl = 'https://tizjimlwfkoniixbetgr.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpemppbWx3ZmtvbmlpeGJldGdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzNDgyNzgsImV4cCI6MjA3MDkyNDI3OH0.Oess7TCevLH3mO0aWxfL5M0Kb_XHEKUBYRYRXKQkdgk';
    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    
    // Uporaba Supabase namesto localStorage
    const useLocalStorage = false;

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let attendance = {};
    let termStatus = {};

    const DAYNAME = ["","Ponedeljek","Torek","Sreda","Četrtek","Petek","Sobota","Nedelja"];
    const DAY_SHORT_NAME = ["", "Pon.", "Tor.", "Sre.", "Čet.", "Pet.", "Sob.", "Ned."];
    const DAY_SHORT_MAP = {
      "ponedeljek": 1, "pon": 1,
      "torek": 2, "tor": 2,
      "sreda": 3, "sre": 3,
      "cetrtek": 4, "cet": 4,
      "petek": 5, "pet": 5,
      "sobota": 6, "sob": 6,
      "nedelja": 7, "ned": 7
    };

    // ===== UI elementi =====
    const elMonthLabel = document.getElementById("monthLabel");
    const elCalendarGrid = document.getElementById("calendarGrid");
    const elPrev = document.getElementById("prevBtn");
    const elNext = document.getElementById("nextBtn");
    const elSummaryBox = document.getElementById("summaryBox");
    
    // Modal
    const elModal = document.getElementById("eventModal");
    const elModalTitle = document.getElementById("modalTitle");
    const elModalMeta = document.getElementById("modalMeta");
    const elAttendanceTable = document.getElementById("attendanceTable").querySelector("tbody");
    const elSubstitutionTable = document.getElementById("substitutionTable").querySelector("tbody");
    const elToggleEventBtn = document.getElementById("toggleEventBtn");
    const elCloseModalBtn = document.getElementById("closeModalBtn");
    const elModalSwimmerSelect = document.getElementById("modalSwimmerSelect");
    const elAddToEventBtn = document.getElementById("addToEventBtn");
    // Modal note
    const elInactiveNote = document.getElementById("inactiveNote");
    const elInactiveNoteText = document.getElementById("inactiveNoteText");
    // Modal za izbiro dneva (mobilna verzija)
    const elDayModal = document.getElementById("dayModal");
    const elDayModalTitle = document.getElementById("dayModalTitle");
    const elDayModalList = document.getElementById("dayModalList");
    const elCloseDayModalBtn = document.getElementById("closeDayModalBtn");
    
    // Modal za opombo
    const elNoteModal = document.getElementById("noteModal");
    const elNoteInput = document.getElementById("noteInput");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
    const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");
    
    // Elementi za opombe o treningu
    const elNotesInput = document.getElementById("notesInput");
    const elSaveNotesBtn = document.getElementById("saveNotesBtn");


    // ===== Pomožne funkcije =====
    function mkSwimmer(first,last,terms=[]){ return { first_name:first, last_name:last, terms:[...new Set(terms)] }; }
    function iso(d){ return d.toISOString().slice(0,10); }
    function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
    function isToday(d){ const t=new Date(); return d.getFullYear()==t.getFullYear() && d.getMonth()==t.getMonth() && d.getDate()==t.getDate(); }
    function isPast(d){ const t=new Date(); t.setHours(0,0,0,0); return d.getTime() < t.getTime(); }
    function startWeekday(y,m){ let w=new Date(y,m,1).getDay(); return w===0?7:w; } // pon=1

    function parseDate(dateStr) {
      const parts = dateStr.split(/[\s/.]/).filter(Boolean);
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      const date = new Date(year, month - 1, day);
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
      }
      return iso(date);
    }

    function formatDate(isoStr) {
      if (!isoStr) return "";
      const [y, m, d] = isoStr.split('-').map(Number);
      return `${String(d).padStart(2, '0')} / ${String(m).padStart(2, '0')} / ${y}`;
    }

    function getTermsForDate(date) {
      const w = date.getDay() === 0 ? 7 : date.getDay();
      const isoDate = iso(date);
      return TERMS.filter(t => isoDate >= t.date_from && isoDate <= t.date_to && t.day == w);
    }
    function termById(id){ return TERMS.find(t=>t.id===id); }

    // POPRAVEK: Prenovljena in poenostavljena logika barvnega kodiranja
    function getAttendanceStatus(date, termId) {
        const ymd = iso(date);
        
        // Plavalci, ki so TRENUTNO dodeljeni temu terminu in niso izbrisani
        const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
        const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
        
        // Vse vnesene prisotnosti za ta datum in termin
        const termAtt = attendance[ymd]?.[termId] || {};
        
        // Preštejemo, koliko DODELJENIH plavalcev ima vneseno prisotnost
        const markedAssignedSwimmersCount = assignedSwimmerIds.filter(id => termAtt.hasOwnProperty(id)).length;
        
        const totalAssignedCount = assignedSwimmers.length;

        // Logika določitve statusa
        if (totalAssignedCount === 0) {
            // Če ni dodeljenih plavalcev, status ne more biti določen in je lahko "popoln"
            return 'complete'; 
        } else if (markedAssignedSwimmersCount === 0) {
            return 'unfilled'; // Ni vnesena nobena prisotnost
        } else if (markedAssignedSwimmersCount === totalAssignedCount) {
            return 'complete'; // Vsi dodeljeni imajo vneseno prisotnost
        } else {
            return 'partial'; // Vsaj ena, a ne vsa prisotnost je vnesena
        }
    }
    
    function getTermStatus(date, termId){
      const ymd = iso(date);
      const status = termStatus[ymd]?.[termId]?.status || "active";
      const note = termStatus[ymd]?.[termId]?.note || "";
      const notes = termStatus[ymd]?.[termId]?.notes || "";
      return { status, note, notes };
    }
    function isInactive(date, termId){ return getTermStatus(date, termId).status === "inactive"; }


    // ===== Pogled meseca =====
    let viewDate = new Date(); viewDate.setDate(1);

    function renderMonth(){
      const y=viewDate.getFullYear(), m=viewDate.getMonth();
      elMonthLabel.textContent = new Date(y,m,1).toLocaleDateString("sl-SI", {month:"long",year:"numeric"});
      elCalendarGrid.innerHTML = "";

      const pad = startWeekday(y,m)-1;
      for(let i=0;i<pad;i++){
        const div=document.createElement("div"); div.className="day disabled"; elCalendarGrid.appendChild(div);
      }

      const dim = daysInMonth(y,m);
      for(let d=1; d<=dim; d++){
        const date = new Date(y,m,d);
        const day = document.createElement("div");
        day.className="day"+(isToday(date)?" today":"");
        const num = document.createElement("div"); num.className="num"; num.textContent=d; day.appendChild(num);

        const todays = getTermsForDate(date);
        todays.sort((a,b)=> a.start_time.localeCompare(b.start_time));

        todays.forEach(t=>{
          const e = document.createElement("div");
          e.className = "event";

          // NOV POPRAVEK: Barvno kodiranje se aplicira samo na današnje ali pretekle dogodke.
          if (!isPast(date) && !isToday(date)) {
              // Ne delamo nič, barva ostane privzeta
          } else {
            const ymd = iso(date);
            const termAtt = attendance[ymd]?.[t.id] || {};
            if (Object.keys(termAtt).length > 0) {
                const status = getAttendanceStatus(date, t.id);
                e.classList.add(status);
            }
          }
          
          if (isInactive(date, t.id)) {
              e.classList.add("disabled");
          }
          
          e.innerHTML = `<span class="time">${t.start_time.slice(0, 5)}<span class="end-time">–${t.end_time.slice(0, 5)}</span></span>`;

          e.title = t.label;
          e.dataset.termId = t.id;
          day.appendChild(e);
        });

        // POPRAVEK: poenostavljena logika za odpiranje modalov
        if (todays.length > 0) {
          day.addEventListener("click", (e) => {
            e.stopPropagation();
            if (todays.length === 1) {
              openEvent(date, todays[0].id);
            } else {
              openDayModal(date);
            }
          });
        }
        
        // Indikator za preveč dogodkov na mobilnih napravah
        if (window.innerWidth <= 768 && todays.length > 3) {
          const more = document.createElement("div");
          more.className = "more-events-indicator";
          more.textContent = `+ ${todays.length - 3} več...`;
          day.appendChild(more);
        }
        
        elCalendarGrid.appendChild(day);
      }
      const summaryData = calculateSummaryData(y, m);
      renderSummary(summaryData);
    }

    // ===== NOV MODAL: izbira termina na določen dan (za mobilno verzijo) =====
    function openDayModal(date) {
      const todaysTerms = getTermsForDate(date).sort((a,b) => a.start_time.localeCompare(b.start_time));
      elDayModalTitle.textContent = `Termini za ${date.toLocaleDateString("sl-SI", { weekday: 'long', day: 'numeric', month: 'long' })}`;
      elDayModalList.innerHTML = "";

      if (todaysTerms.length === 0) {
        elDayModalList.innerHTML = "<p class='muted' style='text-align: center;'>Na ta dan ni terminov.</p>";
      } else {
        todaysTerms.forEach(t => {
          const e = document.createElement("div");
          e.className = "event";
          
          // NOV POPRAVEK: Enako preverjanje za barvno kodiranje tudi v tem modalnem oknu
          if (!isPast(date) && !isToday(date)) {
              // Ne delamo nič
          } else {
            const ymd = iso(date);
            const termAtt = attendance[ymd]?.[t.id] || {};
            if (Object.keys(termAtt).length > 0) {
                const status = getAttendanceStatus(date, t.id);
                e.classList.add(status);
            }
          }

          if (isInactive(date, t.id)) {
              e.classList.add("disabled");
          }

          e.innerHTML = `<span class="time">${t.start_time.slice(0, 5)}<span class="end-time">–${t.end_time.slice(0, 5)}</span></span>`;
          
          e.addEventListener("click", () => {
            closeDayModal();
            openEvent(date, t.id);
          });
          elDayModalList.appendChild(e);
        });
      }
      openModal(elDayModal);
    }

    function closeDayModal() { closeModal(elDayModal); }
    elCloseDayModalBtn.addEventListener("click", closeDayModal);
    elDayModal.addEventListener("click", (e) => { if (e.target === elDayModal) closeDayModal(); });

    // ===== MODAL: odpranje dogodka =====
    let modalCtx = { date:null, termId:null };

    // Nova funkcija za osvežitev podatkov za določen dan
    async function refreshDayData(date) {
      const ymd = iso(date);
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('*')
        .eq('date', ymd);
      
      if (attError) { console.error('Napaka pri osveževanju prisotnosti za dan:', attError); return; }
      
      const { data: statusData, error: statusError } = await supabase
        .from('term_status')
        .select('*')
        .eq('date', ymd);

      if (statusError) { console.error('Napaka pri osveževanju statusa termina za dan:', statusError); return; }
      
      attendance[ymd] = attData.reduce((acc, row) => {
        acc[row.term_id] = acc[row.term_id] || {};
        acc[row.term_id][row.swimmer_id] = row.status;
        return acc;
      }, {});

      termStatus[ymd] = statusData.reduce((acc, row) => {
        acc[row.term_id] = { status: row.status, note: row.note, notes: row.notes };
        return acc;
      }, {});
    }


    async function openEvent(date, termId){
      modalCtx = { date:new Date(date), termId };
      const t = termById(termId);
      elModalTitle.textContent = `${t.label}`;
      elModalMeta.innerHTML = `
        <span class="chip">${formatDate(iso(date))}</span>
        <span class="chip">${DAYNAME[t.day]}</span>
      `;
      
      const ymd = iso(date);
      
      // Ključni popravek: zagotovitev svežih podatkov ob odprtju modala
      await refreshDayData(date);
      
      // Asinhrono pridobivanje prisotnosti za ta termin na ta dan
      const { data, error } = await supabase
        .from('attendance')
        .select('swimmer_id, status')
        .eq('date', ymd)
        .eq('term_id', termId);
      
      if (error) {
          console.error('Napaka pri nalaganju prisotnosti:', error);
          return;
      }
      
      const termAtt = data.reduce((acc, row) => {
        acc[row.swimmer_id] = row.status;
        return acc;
      }, {});
      
      // KRUCIALNA SPREMENJAVA: Namesto, da prepišemo, podatke združimo.
      attendance[ymd] = { ...attendance[ymd], [termId]: termAtt };

      // >>> POPRAVEK: tukaj je težava. Namesto da filtriramo, zgradimo seznam vseh, ki so relevantni.
      // Ločimo plavalce na redno dodeljene in nadomeščanje
      const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => swimmers.find(s => s.id === swimmerId)).filter(Boolean);
      
      // Redno dodeljeni plavalci (tisti, ki so dodeljeni temu terminu)
      const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
      const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
      
      // Plavalci z vneseno prisotnostjo, ki NISO redno dodeljeni temu terminu (nadomeščanje)
      const substitutionSwimmers = swimmersWithAttendance.filter(s => !assignedSwimmerIds.includes(s.id));
      
      // Redno dodeljeni plavalci z vneseno prisotnostjo ali brez
      const regularSwimmers = assignedSwimmers.filter(s => termAtt[s.id] !== undefined || !s.is_deleted);
      
      // Prikaži redno dodeljene plavalce
      elAttendanceTable.innerHTML = "";
      if(regularSwimmers.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td"); td.colSpan=2; td.className="muted"; td.textContent="Ni dodeljenih plavalcev za ta termin.";
        tr.appendChild(td); elAttendanceTable.appendChild(tr);
      } else {
        regularSwimmers.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
          const tr=document.createElement("tr");
          const td1=document.createElement("td"); td1.textContent = `${s.first_name} ${s.last_name}`;
          
          const td2=document.createElement("td");
          td2.style.display = "flex"; td2.style.gap = "4px";
          td2.style.alignItems = "center";

          const status = termAtt[s.id];
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isInactive(date, termId)) { btnPresent.disabled = true; }
          if (status === true) { btnPresent.classList.add("ok"); } else { btnPresent.classList.add("neutral"); }
          btnPresent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          if (status === false) { btnAbsent.classList.add("warn"); } else { btnAbsent.classList.add("neutral"); }
          btnAbsent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          if (isInactive(date, termId)) { btnRemove.disabled = true; }
          btnRemove.addEventListener("click", async ()=>{
              const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('date', ymd)
                .eq('term_id', termId)
                .eq('swimmer_id', s.id);
            if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
                // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
                await refreshDayData(date);
                openEvent(date, termId);
                renderMonth();
            }
          });
          
          tr.appendChild(td1); tr.appendChild(td2); 
          
          td2.appendChild(btnPresent);
          td2.appendChild(btnAbsent);
          td2.appendChild(btnRemove);
          
          elAttendanceTable.appendChild(tr);
        });
      }

      // Prikaži nadomeščanje
      elSubstitutionTable.innerHTML = "";
      if(substitutionSwimmers.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td"); td.colSpan=2; td.className="muted"; td.textContent="Ni nadomeščanja.";
        tr.appendChild(td); elSubstitutionTable.appendChild(tr);
      } else {
        substitutionSwimmers.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
          const tr=document.createElement("tr");
          const td1=document.createElement("td"); td1.textContent = `${s.first_name} ${s.last_name}`;
          
          const td2=document.createElement("td");
          td2.style.display = "flex"; td2.style.gap = "4px";
          td2.style.alignItems = "center";

          const status = termAtt[s.id];
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isInactive(date, termId)) { btnPresent.disabled = true; }
          if (status === true) { btnPresent.classList.add("ok"); } else { btnPresent.classList.add("neutral"); }
          btnPresent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          if (status === false) { btnAbsent.classList.add("warn"); } else { btnAbsent.classList.add("neutral"); }
          btnAbsent.addEventListener("click", async ()=>{
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          if (isInactive(date, termId)) { btnRemove.disabled = true; }
          btnRemove.addEventListener("click", async ()=>{
              const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('date', ymd)
                .eq('term_id', termId)
                .eq('swimmer_id', s.id);
            if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
                // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
                await refreshDayData(date);
                openEvent(date, termId);
                renderMonth();
            }
          });
          
          tr.appendChild(td1); tr.appendChild(td2); 
          
          td2.appendChild(btnPresent);
          td2.appendChild(btnAbsent);
          td2.appendChild(btnRemove);
          
          elSubstitutionTable.appendChild(tr);
        });
      }

      elModalSwimmerSelect.innerHTML = "";
      const allSwimmersInEvent = [...regularSwimmers, ...substitutionSwimmers];
      const currentEventSwimmerIds = allSwimmersInEvent.map(s => s.id);
      const unassigned = swimmers.filter(s => !currentEventSwimmerIds.includes(s.id) && !s.is_deleted)
                               .sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
      
      if(unassigned.length > 0) {
        unassigned.forEach(s => {
          const o = document.createElement("option");
          o.value = s.id;
          o.textContent = `${s.first_name} ${s.last_name}`;
          elModalSwimmerSelect.appendChild(o);
        });
        elAddToEventBtn.style.display = "inline-block";
        elModalSwimmerSelect.style.display = "inline-block";
      } else {
        const o = document.createElement("option");
        o.textContent = "Vsi plavalci so že v treningu ali nadomeščanju.";
        o.disabled = true;
        elModalSwimmerSelect.appendChild(o);
        elAddToEventBtn.style.display = "none";
        elModalSwimmerSelect.style.display = "none";
      }

      const termStatusObj = getTermStatus(date, termId);
      if (termStatusObj.status === "inactive") {
        elToggleEventBtn.textContent = "Aktiviraj trening";
        elInactiveNoteText.textContent = termStatusObj.note;
        elInactiveNote.style.display = "block";
      } else {
        elToggleEventBtn.textContent = "Deaktiviraj trening";
        elInactiveNoteText.textContent = "";
        elInactiveNote.style.display = "none";
      }

      // Nastavitev opomb o treningu
      elNotesInput.value = termStatusObj.notes || "";
      elSaveNotesBtn.textContent = "Shrani trening";
      elSaveNotesBtn.onclick = async () => {
        const notes = elNotesInput.value;
        const { error } = await supabase
          .from('term_status')
          .upsert({ date: ymd, term_id: termId, notes: notes }, { onConflict: ['date', 'term_id'] });
        
        if (error) {
          console.error("Napaka pri shranjevanju zapiska:", error);
          alert("Napaka pri shranjevanju zapiska. Preverite konzolo.");
        } else {
          await refreshDayData(date);
          alert("Zapisek shranjen!");
        }
      };
      
      elToggleEventBtn.onclick = async () => {
        const currentStatus = getTermStatus(date, termId).status;
        const currentNote = getTermStatus(date, termId).note;

        if (currentStatus === "active") {
            elNoteInput.value = currentNote;
            openModal(elNoteModal);
        } else {
            const { error } = await supabase
                .from('term_status')
                .upsert({ date: ymd, term_id: termId, status: "active", note: null }, { onConflict: ['date', 'term_id'] });
            if (error) {
                console.error('Napaka pri aktiviranju statusa:', error);
                alert('Napaka pri aktivaciji. Preverite konzolo.');
                return;
            }
            await refreshDayData(date);
            await openEvent(date, termId);
            renderMonth();
        }
      };

      elConfirmNoteBtn.onclick = async () => {
        const note = elNoteInput.value.trim();
        if (!note) {
          alert("Prosim, vnesite opombo pred potrditvijo.");
          return;
        }
        
        const ymd = iso(modalCtx.date);
        const termId = modalCtx.termId;

        const { error } = await supabase
          .from('term_status')
          .upsert({ date: ymd, term_id: termId, status: "inactive", note }, { onConflict: ['date', 'term_id'] });
        
        if (error) {
          console.error('Napaka pri posodabljanju statusa:', error);
          alert('Napaka pri deaktivaciji. Preverite konzolo.');
          return;
        }

        closeModal(elNoteModal);
        await refreshDayData(modalCtx.date);
        await openEvent(modalCtx.date, modalCtx.termId);
        renderMonth();
      };

      elCancelNoteBtn.onclick = () => { closeModal(elNoteModal); };

      elCloseNoteModalBtn.onclick = () => { closeModal(elNoteModal); };

      elNoteModal.addEventListener("click", (e) => {
        if (e.target === elNoteModal) {
          closeModal(elNoteModal);
        }
      });

      openModal(elModal);
    }
    
    function openModal(modalEl){ modalEl.style.display = "flex"; modalEl.setAttribute("aria-hidden", "false"); }
    function closeModal(modalEl){ modalEl.style.display = "none"; modalEl.setAttribute("aria-hidden", "true"); }

    elCloseModalBtn.addEventListener("click", ()=>{ 
      closeModal(elModal); 
      renderMonth();
    });

    elModal.addEventListener("click", (e)=>{
      if(e.target === elModal){
        closeModal(elModal);
        renderMonth();
      }
    });

    elAddToEventBtn.addEventListener("click", async ()=>{
      const swimmerId = elModalSwimmerSelect.value;
      const swimmer = swimmers.find(s=>s.id === swimmerId);
      if(!swimmer) return;

      const ymd = iso(modalCtx.date);
      const { error } = await supabase
        .from('attendance')
        .upsert({ date: ymd, term_id: modalCtx.termId, swimmer_id: swimmer.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
      
      if (error) { 
        console.error('Napaka pri dodajanju plavalca v trening:', error); 
      } else {
        await refreshDayData(modalCtx.date);
        openEvent(modalCtx.date, modalCtx.termId);
        renderMonth();
      }
    });

    // ===== POPRAVLJENA FUNKCIJA ZA POVZETEK =====
    function calculateSummaryData(year, month) {
      const res = {};
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const today = new Date();
      today.setHours(0,0,0,0);

      // Inicializacija podatkov za vse plavalce (aktivne in izbrisane)
      swimmers.forEach(s => {
        res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
      });

      // Zanka za izračun prisotnosti (att)
      const allAttendance = Object.entries(attendance);
      for (const [date, termData] of allAttendance) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        if (d >= monthStart && d <= monthEnd) {
          for (const termId in termData) {
            for (const swimmerId in termData[termId]) {
              // Preverimo, ali je bil ta termin aktiven, ko je bila prisotnost vnesena
              // Opomba: Ker imamo shranjen 'term_status', to ni več potrebno. Lahko zaupamo, da je prisotnost vnešena samo za aktivne termine.
              if (termData[termId][swimmerId] === true && res[swimmerId]) {
                res[swimmerId].att += 1;
              }
            }
          }
        }
      }

      // Zanka za izračun možnih obiskov (pos)
      const currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const ymd = iso(currentDate);
        const todaysTerms = getTermsForDate(currentDate);

        todaysTerms.forEach(term => {
          const termIsActive = getTermStatus(currentDate, term.id).status === "active";
          
          if (termIsActive) {
            swimmers.forEach(s => {
              if (res[s.id] && s.terms.includes(term.id)) {
                
                if (s.is_deleted) {
                  // Plavalec je izbrisan, štejemo samo, če je datum v preteklosti
                  if (currentDate <= today) {
                    res[s.id].pos += 1;
                  }
                } else {
                  // Plavalec je aktiven, štejemo vse možne obiske
                  res[s.id].pos += 1;
                }
              }
            });
          }
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return res;
    }


    function renderSummary(summaryData) {
        let html = `<table><thead><tr><th>Plavalec</th><th>Obiskani</th><th>Možni</th><th>Delež (%)</th></tr></thead><tbody>`;
        // KLJUČNA SPREMEMBA: filtriramo plavalce, ki nimajo nobenega možnega obiska
        const rows = Object.values(summaryData).filter(r => r.pos > 0).sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
        if(rows.length===0) html += `<tr><td colspan="4" class="muted">Ni plavalcev.</td></tr>`;
        rows.forEach(r=>{
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            html += `<tr><td>${r.first} ${r.last}</td><td>${r.att}</td><td>${r.pos}</td><td>${pct}</td></tr>`;
        });
        html += `</tbody></table>`;
        elSummaryBox.innerHTML = html;
    }

    // ===== Navigacija =====
    elPrev.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonth(); });
    elNext.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonth(); });

    // ===== Nalaganje podatkov =====
    async function loadTerms() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const termsData = localStorage.getItem('terms');
        if (termsData) {
          const data = JSON.parse(termsData);
          TERMS = data.map(t => ({
            ...t,
            label: `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`
          }));
        }
      } else {
        // Uporaba Supabase (ko bo CORS problem rešen)
        try {
          const { data, error } = await supabase.from('terms').select('*');
          if (error) console.error('Napaka pri nalaganju terminov:', error);
          else {
            TERMS = data.map(t => ({
              ...t,
              label: `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`
            }));
          }
        } catch (error) {
          console.error('Napaka pri nalaganju terminov:', error);
        }
      }
    }

    async function loadSwimmers() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const swimmersData = localStorage.getItem('swimmers');
        if (swimmersData) {
          swimmers = JSON.parse(swimmersData);
        }
      } else {
        // Uporaba Supabase (ko bo CORS problem rešen)
        try {
          const { data, error } = await supabase.from('swimmers').select('*');
          if (error) console.error('Napaka pri nalaganju plavalcev:', error);
          else swimmers = data;
        } catch (error) {
          console.error('Napaka pri nalaganju plavalcev:', error);
        }
      }
    }

    async function loadAttendance() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const attendanceData = localStorage.getItem('attendance');
        if (attendanceData) {
          const data = JSON.parse(attendanceData);
          attendance = data.reduce((acc, row) => {
            const date = row.date;
            if (!acc[date]) acc[date] = {};
            if (!acc[date][row.term_id]) acc[date][row.term_id] = {};
            acc[date][row.term_id][row.swimmer_id] = row.status;
            return acc;
          }, {});
        }
      } else {
        // Uporaba Supabase (ko bo CORS problem rešen)
        try {
          const { data, error } = await supabase.from('attendance').select('*');
          if (error) console.error('Napaka pri nalaganju prisotnosti:', error);
          else {
            attendance = data.reduce((acc, row) => {
              const date = row.date;
              if (!acc[date]) acc[date] = {};
              if (!acc[date][row.term_id]) acc[date][row.term_id] = {};
              acc[date][row.term_id][row.swimmer_id] = row.status;
              return acc;
          }, {});
          }
        } catch (error) {
          console.error('Napaka pri nalaganju prisotnosti:', error);
        }
      }
    }

    async function loadTermStatus() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const termStatusData = localStorage.getItem('termStatus');
        if (termStatusData) {
          const data = JSON.parse(termStatusData);
          termStatus = data.reduce((acc, row) => {
            const date = row.date;
            if (!acc[date]) acc[date] = {};
            acc[date][row.term_id] = { status: row.status, note: row.note, notes: row.notes };
            return acc;
          }, {});
        }
      } else {
        // Uporaba Supabase (ko bo CORS problem rešen)
        try {
          const { data, error } = await supabase.from('term_status').select('*');
          if (error) console.error('Napaka pri nalaganju statusa terminov:', error);
          else {
            termStatus = data.reduce((acc, row) => {
              const date = row.date;
              if (!acc[date]) acc[date] = {};
              acc[date][row.term_id] = { status: row.status, note: row.note, notes: row.notes };
              return acc;
          }, {});
          }
        } catch (error) {
          console.error('Napaka pri nalaganju statusa terminov:', error);
        }
      }
    }

    async function loadAllData() {
      await Promise.all([loadTerms(), loadSwimmers(), loadAttendance(), loadTermStatus()]);
      renderMonth();
    }

    // ===== Inicializacija =====
    loadAllData();
});