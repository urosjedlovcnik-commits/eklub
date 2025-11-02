// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Uporabi centralizirano konfiguracijo
    const supabase = createSupabaseClient();
    if (!supabase) {
        alert('Napaka: Ne morem vzpostaviti povezave z bazo podatkov.');
        return;
    }
    
    // Uporaba Supabase namesto localStorage
    const useLocalStorage = false;

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let trainers = [];
    let attendance = {};
    let termStatus = {};
    let trainerAttendance = {};

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

    
    // Modal
    const elModal = document.getElementById("eventModal");
    const elModalTitle = document.getElementById("modalTitle");
    const elModalMeta = document.getElementById("modalMeta");
    const elAttendanceTable = document.getElementById("attendanceTable").querySelector("tbody");
    const elTrainerAttendanceTable = document.getElementById("trainerAttendanceTable").querySelector("tbody");
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
    function iso(d){ 
      // Formatira lokalni datum kot ISO string (YYYY-MM-DD)
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      
      const isoString = year + '-' + 
                       String(month + 1).padStart(2, '0') + '-' + 
                       String(day).padStart(2, '0');
      
      return isoString;
    }
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

    // Cache za getTermsForDate
    let termsForDateCache = new Map();
    
    function getTermsForDate(date) {
      const cacheKey = iso(date);
      let cached = termsForDateCache.get(cacheKey);
      if (cached) return cached;
      
      const w = date.getDay() === 0 ? 7 : date.getDay();
      const isoDate = iso(date);
      const result = TERMS.filter(t => isoDate >= t.date_from && isoDate <= t.date_to && t.day == w);
      
      termsForDateCache.set(cacheKey, result);
      return result;
    }
    function termById(id){ return TERMS.find(t=>t.id===id); }

    async function getTrainersForTerm(termId) {
      if (useLocalStorage) {
        // Za localStorage bi potrebovali ločeno tabelo trainer_terms
        return [];
      } else {
        try {
          const { data, error } = await supabase
            .from('trainer_terms')
            .select('trainer_id')
            .eq('term_id', termId);
          
          if (error) {
            console.error('Napaka pri nalaganju trenerjev za termin:', error);
            return [];
          }
          
          const trainerIds = data.map(row => row.trainer_id);
          return trainers.filter(trainer => trainerIds.includes(trainer.id));
        } catch (error) {
          console.error('Napaka pri nalaganju trenerjev za termin:', error);
          return [];
        }
      }
    }

    async function updateTrainerAttendance(date, termId, trainerId, present, note = '') {
      if (useLocalStorage) {
        // Za localStorage bi potrebovali ločeno tabelo trainer_attendance
        return;
      } else {
        try {
          const { error } = await supabase
            .from('trainer_attendance')
            .upsert({ 
              date, 
              term_id: termId, 
              trainer_id: trainerId, 
              present,
              note
            }, { 
              onConflict: ['date', 'term_id', 'trainer_id'] 
            });
          
          if (error) {
            console.error('Napaka pri posodabljanju prisotnosti trenerja:', error);
            
            // Če je RLS napaka, prikaži uporabniku razumljivo sporočilo
            if (error.code === '42501') {
              alert('⚠️ Varnostna napaka: RLS policy za trainer_attendance ni pravilno nastavljen.\n\nProblem bo rešen s strani administratorja.');
              console.error('RLS Policy napaka - potrebno nastaviti policy za trainer_attendance tabelo');
            } else {
              alert('Napaka pri shranjevanju prisotnosti trenerja: ' + error.message);
            }
            
            // Kljub napaki posodobi lokalno stanje, da se UI pravilno prikaže
            if (!trainerAttendance[date]) trainerAttendance[date] = {};
            if (!trainerAttendance[date][termId]) trainerAttendance[date][termId] = {};
            trainerAttendance[date][termId][trainerId] = { present, note };
            
          } else {
            // Posodobi lokalno stanje
            if (!trainerAttendance[date]) trainerAttendance[date] = {};
            if (!trainerAttendance[date][termId]) trainerAttendance[date][termId] = {};
            trainerAttendance[date][termId][trainerId] = { present, note };
          }
        } catch (error) {
          console.error('Napaka pri posodabljanju prisotnosti trenerja:', error);
          alert('Nepričakovana napaka pri shranjevanju. Preverite internetno povezavo.');
        }
      }
    }

    // Funkcija za prikaz prostora za opombe trenerjev
    function showTrainerNotesSection(date, termId, trainerId, trainerName) {
      const trainerNotesSection = document.getElementById('trainerNotesSection');
      const trainerNotesInput = document.getElementById('trainerNotesInput');
      const trainerNotesTextarea = document.getElementById('trainerNotesTextarea');
      
      // Shrani podatke za kasnejšo uporabo
      trainerNotesSection.setAttribute('data-date', date);
      trainerNotesSection.setAttribute('data-term-id', termId);
      trainerNotesSection.setAttribute('data-trainer-id', trainerId);
      
      // Napolni dropdown z vsemi trenerji (razen trenutnega)
      trainerNotesInput.innerHTML = '<option value="">Izberi trenerja...</option>';
      trainers.forEach(trainer => {
        if (trainer.id !== trainerId && !trainer.is_deleted) {
          const option = document.createElement('option');
          option.value = trainer.id;
          option.textContent = `${trainer.first_name} ${trainer.last_name}`;
          trainerNotesInput.appendChild(option);
        }
      });
      
      // Prikaži obstoječo opombo, če je že vnešena
      const existingNote = trainerAttendance[date]?.[termId]?.[trainerId]?.note || '';
      if (existingNote) {
        // Preveri, ali je opomba ID trenerja ali besedilo
        const substituteTrainer = trainers.find(t => t.id === existingNote);
        if (substituteTrainer) {
          // Če je ID trenerja, izberi v dropdown
          trainerNotesInput.value = substituteTrainer.id;
          trainerNotesTextarea.value = '';
        } else {
          // Če je besedilo, prikaži v textarea
          trainerNotesTextarea.value = existingNote;
          trainerNotesInput.value = '';
        }
      } else {
        // Počisti oba polja, če ni obstoječe opombe
        trainerNotesInput.value = '';
        trainerNotesTextarea.value = '';
      }
      
      // Prikaži sekcijo
      trainerNotesSection.style.display = 'block';
      
      // Dodaj event listenerje za medsebojno izključevanje
      trainerNotesInput.addEventListener('change', () => {
        if (trainerNotesInput.value) {
          trainerNotesTextarea.value = '';
        }
      });
      
      trainerNotesTextarea.addEventListener('input', () => {
        if (trainerNotesTextarea.value.trim()) {
          trainerNotesInput.value = '';
        }
      });
    }
    
         // Funkcija za skrivanje prostora za opombe trenerjev
     function hideTrainerNotesSection() {
       const trainerNotesSection = document.getElementById('trainerNotesSection');
       const trainerNotesInput = document.getElementById('trainerNotesInput');
       const trainerNotesTextarea = document.getElementById('trainerNotesTextarea');
       
       trainerNotesSection.style.display = 'none';
       trainerNotesInput.innerHTML = '<option value="">Izberi trenerja...</option>';
       trainerNotesTextarea.value = '';
     }
     
     // Funkcija za osvežitev podatkov v trenutnem modalu
     async function refreshModalData(date, termId) {
       // Shrani trenutne lokalne podatke
       const currentTrainerAttendance = { ...trainerAttendance };
       const currentAttendance = { ...attendance };
       
       await refreshDayData(date);
       
       // Obnovi lokalne podatke, ki so bili posodobljeni v trenutnem modalu
       if (currentTrainerAttendance[iso(date)] && currentTrainerAttendance[iso(date)][termId]) {
         if (!trainerAttendance[iso(date)]) trainerAttendance[iso(date)] = {};
         if (!trainerAttendance[iso(date)][termId]) trainerAttendance[iso(date)][termId] = {};
         Object.assign(trainerAttendance[iso(date)][termId], currentTrainerAttendance[iso(date)][termId]);
       }
       
       if (currentAttendance[iso(date)] && currentAttendance[iso(date)][termId]) {
         if (!attendance[iso(date)]) attendance[iso(date)] = {};
         if (!attendance[iso(date)][termId]) attendance[iso(date)][termId] = {};
         Object.assign(attendance[iso(date)][termId], currentAttendance[iso(date)][termId]);
       }
       
       // Ponovno prikaži trenutni modal z osveženimi podatki
       await openEvent(date, termId);
     }

    // POPRAVEK: Prenovljena in poenostavljena logika barvnega kodiranja
    // Cache za getAttendanceStatus
    let attendanceStatusFunctionCache = new Map();
    
    function getAttendanceStatus(date, termId) {
        const cacheKey = `${iso(date)}-${termId}`;
        let cached = attendanceStatusFunctionCache.get(cacheKey);
        if (cached !== undefined) return cached;
        
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
        let result;
        if (totalAssignedCount === 0) {
            // Če ni dodeljenih plavalcev, status ne more biti določen in je lahko "popoln"
            result = 'complete'; 
        } else if (markedAssignedSwimmersCount === 0) {
            result = 'unfilled'; // Ni vnesena nobena prisotnost
        } else if (markedAssignedSwimmersCount === totalAssignedCount) {
            result = 'complete'; // Vsi dodeljeni imajo vneseno prisotnost
        } else {
            result = 'partial'; // Vsaj ena, a ne vsa prisotnost je vnesena
        }
        
        attendanceStatusFunctionCache.set(cacheKey, result);
        return result;
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

    // Cache za optimizacijo
    let termsCache = new Map();
    let attendanceStatusCache = new Map();
    
    // Funkcija za čiščenje cache-ja
    function clearCache() {
      termsCache.clear();
      attendanceStatusCache.clear();
      termsForDateCache.clear();
      attendanceStatusFunctionCache.clear();
    }
    
    function renderMonth(){
      const y=viewDate.getFullYear(), m=viewDate.getMonth();
      elMonthLabel.textContent = new Date(y,m,1).toLocaleDateString("sl-SI", {month:"long",year:"numeric"});
      
      // Ustvari fragment za boljšo performanco
      const fragment = document.createDocumentFragment();
      
      const pad = startWeekday(y,m)-1;
      for(let i=0;i<pad;i++){
        const div=document.createElement("div"); 
        div.className="day disabled"; 
        fragment.appendChild(div);
      }

      const dim = daysInMonth(y,m);
      const isMobile = window.innerWidth <= 768;
      
      for(let d=1; d<=dim; d++){
        const date = new Date(y,m,d);
        const day = document.createElement("div");
        day.className="day"+(isToday(date)?" today":"");
        
        const num = document.createElement("div"); 
        num.className="num"; 
        num.textContent=d; 
        day.appendChild(num);

        // Cache-iranje terminov za dan
        const cacheKey = `${y}-${m}-${d}`;
        let todays = termsCache.get(cacheKey);
        if (!todays) {
          todays = getTermsForDate(date);
          todays.sort((a,b)=> a.start_time.localeCompare(b.start_time));
          termsCache.set(cacheKey, todays);
        }

        todays.forEach(t=>{
          const e = document.createElement("div");
          e.className = "event";

          // Optimizirano barvno kodiranje
          const isPastOrToday = isPast(date) || isToday(date);
          if (isPastOrToday) {
            const statusCacheKey = `${iso(date)}-${t.id}`;
            let status = attendanceStatusCache.get(statusCacheKey);
            if (!status) {
              // POPRAVEK: Vedno preverimo status za pretekle termine, tudi če ni vnesene prisotnosti
              // Da bi pretekli termini brez prisotnosti bili rdeči (unfilled)
              status = getAttendanceStatus(date, t.id);
              attendanceStatusCache.set(statusCacheKey, status);
            }
            if (status) {
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

        // Event delegation za boljšo performanco
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
        
        // Mobilni indikator
        if (isMobile && todays.length > 3) {
          const more = document.createElement("div");
          more.className = "more-events-indicator";
          more.textContent = `+ ${todays.length - 3} več...`;
          day.appendChild(more);
        }
        
        fragment.appendChild(day);
      }
      
      // Enkratna DOM manipulacija
      elCalendarGrid.innerHTML = "";
      elCalendarGrid.appendChild(fragment);
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
              // Ne delamo nič za prihodnje termine
          } else {
            // POPRAVEK: Vedno preverimo status za pretekle/današnje termine, tudi če ni vnesene prisotnosti
            // Da bi pretekli termini brez prisotnosti bili rdeči (unfilled)
            const status = getAttendanceStatus(date, t.id);
            e.classList.add(status);
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
      
      // Osveži podatke o prisotnosti trenerjev
      const { data: trainerAttData, error: trainerAttError } = await supabase
        .from('trainer_attendance')
        .select('*')
        .eq('date', ymd);
      
      if (trainerAttError) { 
        console.error('Napaka pri osveževanju prisotnosti trenerjev za dan:', trainerAttError); 
      } else {
        trainerAttendance[ymd] = trainerAttData.reduce((acc, row) => {
          if (!acc[row.term_id]) acc[row.term_id] = {};
          acc[row.term_id][row.trainer_id] = { present: row.present, note: row.note };
          return acc;
        }, {});
      }
      
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
      
      // POSODOBITEV: Osvežimo lokalne podatke o prisotnosti
      if (!attendance[ymd]) attendance[ymd] = {};
      attendance[ymd][termId] = termAtt;

      // >>> POPRAVEK: tukaj je težava. Namesto da filtriramo, zgradimo seznam vseh, ki so relevantni.
      // Ločimo plavalce na redno dodeljene in nadomeščanje
      const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => swimmers.find(s => s.id === swimmerId)).filter(Boolean);
      
      // Redno dodeljeni plavalci (tisti, ki so dodeljeni temu terminu)
      const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
      const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
      
      // Plavalci z vneseno prisotnostjo, ki NISO redno dodeljeni temu terminu (nadomeščanje ali odstranjeni iz termina)
      // DODANO: Tudi plavalci z prisotnostjo, ki so izbrisani iz termina, vendar imajo vneseno prisotnost
      const substitutionSwimmers = swimmersWithAttendance.filter(s => !assignedSwimmerIds.includes(s.id));
      
      // Redno dodeljeni plavalci z vneseno prisotnostjo ali brez
      const regularSwimmers = assignedSwimmers.filter(s => termAtt[s.id] !== undefined || !s.is_deleted);
      
      // DODANO: Prikaži tudi plavalce z prisotnostjo, ki so bili odstranjeni iz termina
      // Združimo regularSwimmers in substitutionSwimmers za prikaz vse prisotnosti
      const allSwimmersToShow = [...regularSwimmers, ...substitutionSwimmers.filter(s => termAtt[s.id] !== undefined)];
      
             // Skrij prostor za opombe ob odprtju modala
       hideTrainerNotesSection();
       
       // Prikaži prisotnost trenerjev
       elTrainerAttendanceTable.innerHTML = "";
       const trainersForTerm = await getTrainersForTerm(termId);
      if (trainersForTerm.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td"); 
        td.colSpan = 2; 
        td.className = "muted"; 
        td.textContent = "Ni dodeljenih trenerjev za ta termin.";
        tr.appendChild(td); 
        elTrainerAttendanceTable.appendChild(tr);
      } else {
        trainersForTerm.forEach(trainer => {
          const tr = document.createElement("tr");
          const td1 = document.createElement("td"); 
          td1.textContent = `${trainer.first_name} ${trainer.last_name}`;
          
          const td2 = document.createElement("td");
          td2.style.display = "flex"; 
          td2.style.gap = "4px";
          td2.style.alignItems = "center";

          const trainerStatus = trainerAttendance[ymd]?.[termId]?.[trainer.id];
          const isPresent = trainerStatus?.present;
          
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isInactive(date, termId)) { btnPresent.disabled = true; }
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          
                     // Pravilno barvno kodiranje za trenerje
// console.log('🔍 DEBUG: Barvno kodiranje trenerja:', trainer.id);
           // Najprej počisti vse barvne razrede
           btnPresent.classList.remove("ok", "warn", "neutral");
           btnAbsent.classList.remove("ok", "warn", "neutral");
           
           if (isPresent === true) { 
             btnPresent.classList.add("ok"); 
             btnAbsent.classList.add("neutral");
           } else if (isPresent === false) { 
             btnPresent.classList.add("neutral"); 
             btnAbsent.classList.add("warn");
           } else {
             btnPresent.classList.add("neutral"); 
             btnAbsent.classList.add("neutral");
           }
          
          btnPresent.addEventListener("click", async () => {
            const newStatus = isPresent === true ? false : true;
            
                         await updateTrainerAttendance(ymd, termId, trainer.id, newStatus);
             // Posodobi lokalne podatke
             if (!trainerAttendance[ymd]) trainerAttendance[ymd] = {};
             if (!trainerAttendance[ymd][termId]) trainerAttendance[ymd][termId] = {};
             trainerAttendance[ymd][termId][trainer.id] = { present: newStatus, note: trainerAttendance[ymd]?.[termId]?.[trainer.id]?.note || '' };
             
             // Skrij prostor za opombe, če je trener sedaj prisoten
             if (newStatus === true) {
               hideTrainerNotesSection();
             }
             
             // Osveži podatke v trenutnem modalu
             await refreshModalData(date, termId);
          });
          
                     btnAbsent.addEventListener("click", async () => {
             if (isPresent === false) {
               // Če je trener že odsoten, prikaži prostor za opombe
               showTrainerNotesSection(ymd, termId, trainer.id, trainer.first_name + ' ' + trainer.last_name);
             } else {
               // Če je trener prisoten, ga označi kot odsotnega
               await updateTrainerAttendance(ymd, termId, trainer.id, false);
               // Posodobi lokalne podatke
               if (!trainerAttendance[ymd]) trainerAttendance[ymd] = {};
               if (!trainerAttendance[ymd][termId]) trainerAttendance[ymd][termId] = {};
               trainerAttendance[ymd][termId][trainer.id] = { present: false, note: trainerAttendance[ymd]?.[termId]?.[trainer.id]?.note || '' };
               
               // Prikaži prostor za opombe po označitvi kot odsotnega
               showTrainerNotesSection(ymd, termId, trainer.id, trainer.first_name + ' ' + trainer.last_name);
               
               // Osveži podatke v trenutnem modalu
               await refreshModalData(date, termId);
             }
           });
          
                     td2.appendChild(btnPresent);
           td2.appendChild(btnAbsent);
           tr.appendChild(td1);
           tr.appendChild(td2);
           elTrainerAttendanceTable.appendChild(tr);
           
           // Prikaži prostor za opombe, če je trener odsoten
           if (isPresent === false) {
             showTrainerNotesSection(ymd, termId, trainer.id, trainer.first_name + ' ' + trainer.last_name);
           }
        });
      }

      // Prikaži redno dodeljene plavalce IN plavalce z prisotnostjo, ki niso več dodeljeni
      elAttendanceTable.innerHTML = "";
      
      // Združimo vse plavalce za prikaz: redno dodeljene in tiste z prisotnostjo (tudi če niso več dodeljeni)
      const allSwimmersWithData = [...assignedSwimmers];
      
      // Dodaj plavalce z prisotnostjo, ki niso več dodeljeni (tudi če so izbrisani iz termina)
      substitutionSwimmers.forEach(s => {
        if (termAtt[s.id] !== undefined && !allSwimmersWithData.find(sw => sw.id === s.id)) {
          allSwimmersWithData.push(s);
        }
      });
      
      if(allSwimmersWithData.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td"); td.colSpan=2; td.className="muted"; td.textContent="Ni dodeljenih plavalcev za ta termin.";
        tr.appendChild(td); elAttendanceTable.appendChild(tr);
      } else {
        allSwimmersWithData.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
          const tr=document.createElement("tr");
          const td1=document.createElement("td");
          
          // Preveri, ali je plavalec še vedno dodeljen terminu
          const isCurrentlyAssigned = assignedSwimmerIds.includes(s.id);
          if (!isCurrentlyAssigned && termAtt[s.id] !== undefined) {
            // Če ni več dodeljen, vendar ima prisotnost, prikaži oznako
            td1.innerHTML = `${s.first_name} ${s.last_name} <span class="muted" style="font-size: 11px; font-style: italic;">(odstranjen iz termina)</span>`;
          } else {
            td1.textContent = `${s.first_name} ${s.last_name}`;
          }
          
          const td2=document.createElement("td");
          td2.style.display = "flex"; td2.style.gap = "4px";
          td2.style.alignItems = "center";

          const status = termAtt[s.id];
          const btnPresent = document.createElement("button");
          btnPresent.textContent = "Prisoten";
          btnPresent.className = "btn";
          if (isInactive(date, termId)) { btnPresent.disabled = true; }
          
                     // Pravilno barvno kodiranje za plavalce
// console.log('🔍 DEBUG: Barvno kodiranje plavalca:', s.id);
// console.log('🔍 DEBUG: Trenutno stanje status:', status);
           
           // Najprej počisti vse barvne razrede
           btnPresent.classList.remove("ok", "warn", "neutral");
           
           if (status === true) { 
             btnPresent.classList.add("ok"); 
// console.log('🔍 DEBUG: Plavalec prisoten - Prisoten: ok (zelen)');
           } else { 
             btnPresent.classList.add("neutral"); 
// console.log('🔍 DEBUG: Plavalec brez statusa - Prisoten: neutral (siv)');
           }
          
          btnPresent.addEventListener("click", async ()=>{
// console.log('🔍 DEBUG: Plavalec gumb Prisoten kliknjen');
// console.log('🔍 DEBUG: Trenutno stanje status:', status);
// console.log('🔍 DEBUG: Plavalec ID:', s.id);
            
            const newStatus = status === true ? false : true;
// console.log('🔍 DEBUG: Novo stanje:', newStatus);
            
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: newStatus }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshModalData(date, termId);
              renderMonth();
            }
          });
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          
                     // Pravilno barvno kodiranje za plavalce
           // Najprej počisti vse barvne razrede
           btnAbsent.classList.remove("ok", "warn", "neutral");
           
           if (status === false) { 
             btnAbsent.classList.add("warn"); 
           } else { 
             btnAbsent.classList.add("neutral"); 
           }
          
          btnAbsent.addEventListener("click", async ()=>{
            const newStatus = status === false ? true : false;
            
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: newStatus }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              await refreshModalData(date, termId);
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
                await refreshModalData(date, termId);
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
          // Najprej počisti vse barvne razrede
          btnPresent.classList.remove("ok", "warn", "neutral");
          
          if (status === true) { 
            btnPresent.classList.add("ok"); 
          } else { 
            btnPresent.classList.add("neutral"); 
          }
          btnPresent.addEventListener("click", async ()=>{
// console.log('🔍 DEBUG: Nadomeščanje gumb Prisoten kliknjen');
// console.log('🔍 DEBUG: Trenutno stanje status:', status);
// console.log('🔍 DEBUG: Plavalec ID:', s.id);
            
            const newStatus = status === true ? false : true;
// console.log('🔍 DEBUG: Novo stanje:', newStatus);
            
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: newStatus }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
// console.log('🔍 DEBUG: Nadomeščanje prisotnost posodobljena v Supabase');
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              if (!attendance[ymd]) attendance[ymd] = {};
              if (!attendance[ymd][termId]) attendance[ymd][termId] = {};
              attendance[ymd][termId][s.id] = newStatus;
              
// console.log('🔍 DEBUG: Lokalni podatki posodobljeni:', attendance[ymd][termId][s.id]);
              
              await refreshModalData(date, termId);
              renderMonth();
            }
          });
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }
          // Najprej počisti vse barvne razrede
          btnAbsent.classList.remove("ok", "warn", "neutral");
          
          if (status === false) { 
            btnAbsent.classList.add("warn"); 
          } else { 
            btnAbsent.classList.add("neutral"); 
          }
          btnAbsent.addEventListener("click", async ()=>{
            const newStatus = status === false ? true : false;
            
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: newStatus }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              // POSODOBITEV LOKALNIH PODATKOV IN PRIKAZ
              if (!attendance[ymd]) attendance[ymd] = {};
              if (!attendance[ymd][termId]) attendance[ymd][termId] = {};
              attendance[ymd][termId][s.id] = newStatus;
              
              await refreshModalData(date, termId);
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
                await refreshModalData(date, termId);
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
            await refreshModalData(date, termId);
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

    // Event listener za gumb "Ponastavi trening"
    const elResetAttendanceBtn = document.getElementById('resetAttendanceBtn');
    if (elResetAttendanceBtn) {
      elResetAttendanceBtn.addEventListener('click', async () => {
        if (!modalCtx.date || !modalCtx.termId) return;
        
        const confirmed = confirm('Ali ste prepričani, da želite ponastaviti vso prisotnost za ta trening? To bo izbrisalo vse vnesene podatke o prisotnosti plavalcev in trenerjev.');
        if (!confirmed) return;
        
        try {
          const ymd = iso(modalCtx.date);
          const termId = modalCtx.termId;
          
          // Izbriši vso prisotnost plavalcev za ta termin
          const { error: attendanceError } = await supabase
            .from('attendance')
            .delete()
            .eq('date', ymd)
            .eq('term_id', termId);
          
          if (attendanceError) {
            console.error('Napaka pri brisanju prisotnosti plavalcev:', attendanceError);
            alert('Napaka pri brisanju prisotnosti plavalcev: ' + attendanceError.message);
            return;
          }
          
          // Izbriši vso prisotnost trenerjev za ta termin
          const { error: trainerAttendanceError } = await supabase
            .from('trainer_attendance')
            .delete()
            .eq('date', ymd)
            .eq('term_id', termId);
          
          if (trainerAttendanceError) {
            console.error('Napaka pri brisanju prisotnosti trenerjev:', trainerAttendanceError);
            alert('Napaka pri brisanju prisotnosti trenerjev: ' + trainerAttendanceError.message);
            return;
          }
          
          // Počisti lokalne podatke
          if (attendance[ymd] && attendance[ymd][termId]) {
            delete attendance[ymd][termId];
          }
          
          if (trainerAttendance[ymd] && trainerAttendance[ymd][termId]) {
            delete trainerAttendance[ymd][termId];
          }
          
          // Počisti cache
          clearCache();
          
          // Osveži modal
          await refreshModalData(modalCtx.date, modalCtx.termId);
          renderMonth();
          
          alert('Prisotnost je bila uspešno ponastavljena!');
          
        } catch (error) {
          console.error('Napaka pri ponastavitvi prisotnosti:', error);
          alert('Napaka pri ponastavitvi prisotnosti: ' + error.message);
        }
      });
    }

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

    // Debouncing za navigacijo
    let navigationTimeout;
    function debouncedRender() {
      clearTimeout(navigationTimeout);
      navigationTimeout = setTimeout(() => {
        clearCache();
        renderMonth();
      }, 50);
    }
    
    // ===== Navigacija =====
    elPrev.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()-1); debouncedRender(); });
    elNext.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()+1); debouncedRender(); });

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

    async function loadTrainers() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const trainersData = localStorage.getItem('trainers');
        if (trainersData) {
          trainers = JSON.parse(trainersData);
        }
      } else {
        // Uporaba Supabase
        try {
          const { data, error } = await supabase.from('trainers').select('*');
          if (error) console.error('Napaka pri nalaganju trenerjev:', error);
          else trainers = data;
        } catch (error) {
          console.error('Napaka pri nalaganju trenerjev:', error);
        }
      }
    }

    async function loadTrainerAttendance() {
      if (useLocalStorage) {
        // Uporaba localStorage
        const trainerAttendanceData = localStorage.getItem('trainerAttendance');
        if (trainerAttendanceData) {
          const data = JSON.parse(trainerAttendanceData);
          trainerAttendance = data.reduce((acc, row) => {
            const date = row.date;
            if (!acc[date]) acc[date] = {};
            if (!acc[date][row.term_id]) acc[date][row.term_id] = {};
            acc[date][row.term_id][row.trainer_id] = { present: row.present, note: row.note };
            return acc;
          }, {});
        }
      } else {
        // Uporaba Supabase
        try {
          const { data, error } = await supabase.from('trainer_attendance').select('*');
          if (error) console.error('Napaka pri nalaganju prisotnosti trenerjev:', error);
          else {
            trainerAttendance = data.reduce((acc, row) => {
              const date = row.date;
              if (!acc[date]) acc[date] = {};
              if (!acc[date][row.term_id]) acc[date][row.term_id] = {};
              acc[date][row.term_id][row.trainer_id] = { present: row.present, note: row.note };
              return acc;
            }, {});
          }
        } catch (error) {
          console.error('Napaka pri nalaganju prisotnosti trenerjev:', error);
        }
      }
    }

    async function loadAllData() {
      await Promise.all([loadTerms(), loadSwimmers(), loadTrainers(), loadAttendance(), loadTrainerAttendance(), loadTermStatus()]);
      clearCache(); // Počisti cache ob osvežitvi podatkov
      renderMonth();
    }



    // ===== Event listenerji za prostor opomb trenerjev =====
    const saveTrainerNotesBtn = document.getElementById('saveTrainerNotesBtn');
    const cancelTrainerNotesBtn = document.getElementById('cancelTrainerNotesBtn');
    const trainerNotesSection = document.getElementById('trainerNotesSection');

    if (saveTrainerNotesBtn) {
      saveTrainerNotesBtn.addEventListener('click', async () => {
        const date = trainerNotesSection.getAttribute('data-date');
        const termId = trainerNotesSection.getAttribute('data-term-id');
        const trainerId = trainerNotesSection.getAttribute('data-trainer-id');
        const substituteTrainerId = document.getElementById('trainerNotesInput').value.trim();
        const substituteTrainerName = document.getElementById('trainerNotesTextarea').value.trim();

        if (substituteTrainerId || substituteTrainerName) {
          if (substituteTrainerId) {
            // Če je izbran trener iz dropdown-a - doda prisotnost nadomestnega trenerja
            const substituteTrainer = trainers.find(t => t.id === substituteTrainerId);
            
            if (substituteTrainer) {
              // Shrani opombo o nadomestnem trenerju pri originalnem trenerju
              await updateTrainerAttendance(date, termId, trainerId, false, `Nadomešča: ${substituteTrainer.first_name} ${substituteTrainer.last_name} (${substituteTrainerId})`);
            }
          } else {
            // Če je vneseno ime novega trenerja - shrani kot opombo
            const noteToSave = substituteTrainerName;
            // Shrani opombo o nadomestnem trenerju
            await updateTrainerAttendance(date, termId, trainerId, false, noteToSave);
          }
          
          await refreshModalData(new Date(date), termId);
          hideTrainerNotesSection();
        } else {
          alert('Prosim izberite nadomestnega trenerja iz sistema ali vnesite ime novega trenerja');
        }
      });
    }

    if (cancelTrainerNotesBtn) {
      cancelTrainerNotesBtn.addEventListener('click', () => {
        hideTrainerNotesSection();
      });
    }

    // ===== Inicializacija =====
    loadAllData();
});
