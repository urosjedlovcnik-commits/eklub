// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

    // Stanja bodo naložena asinhrono
    let TERMS = [];
    let swimmers = [];
    let trainers = [];
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
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
    const elAddSwimmerBtn = document.getElementById("addSwimmerBtn");
    const elSwimmerSelect = document.getElementById("swimmerSelect");
    const elTermSelect = document.getElementById("termSelect");
    const elAssignTermBtn = document.getElementById("assignTermBtn");
    // NOVO: Gumb za brisanje plavalca
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn"); 
    const elSwimmerInfo = document.getElementById("swimmerInfo");
    const elCsvInput = document.getElementById("csvInput");
    const elCsvTermsInput = document.getElementById("csvTermsInput");
    // Export elementi
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");
    const elExportTrainerMonthSelect = document.getElementById("exportTrainerMonthSelect");
    const elExportTrainerYearSelect = document.getElementById("exportTrainerYearSelect");
    const elExportTrainerCsvBtn = document.getElementById("exportTrainerCsvBtn");
    // Novi termini
    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDateFrom = document.getElementById("newTermDateFrom");
    const elNewTermDateTo = document.getElementById("newTermDateTo");
    const elAddTermBtn = document.getElementById("addTermBtn");
    // Upravljanje terminov
    const elTermList = document.getElementById("termList");
    // Trenerji
    const elTrainersList = document.getElementById("trainersList");
    const elTrainerAttendanceList = document.getElementById("trainerAttendanceList");
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
    // Modal za urejanje terminov
    const elEditTermModal = document.getElementById("editTermModal");
    const elEditTermModalTitle = document.getElementById("editTermModalTitle");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
    const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");
    
    // Modal za opombo
    const elNoteModal = document.getElementById("noteModal");
    const elNoteInput = document.getElementById("noteInput");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
    const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");
    
    // Elementi za opombe o treningu
    const elNotesInput = document.getElementById("notesInput");
    const elSaveNotesBtn = document.getElementById("saveNotesBtn");
    
    // UI elementi za prisotnost trenerjev
    const elTrainerAttendanceBox = document.getElementById("trainerAttendanceBox");
    const elTrainerPresentCheckbox = document.getElementById("trainerPresentCheckbox");
    const elTrainerNoteInput = document.getElementById("trainerNoteInput");
    const elSubstituteTrainerInfo = document.getElementById("substituteTrainerInfo");
    const elSubstituteTrainerName = document.getElementById("substituteTrainerName");
    const elSubstituteTrainerReason = document.getElementById("substituteTrainerReason");


    // ===== Pomožne funkcije =====
    function mkSwimmer(first,last,terms=[]){ return { first_name:first, last_name:last, terms:[...new Set(terms)] }; }
    function iso(d){ 
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    function daysInMonth(y,m){ return new Date(y,m+1,0,12,0,0).getDate(); }
    function isToday(d){ const t=new Date(); t.setHours(12,0,0,0); return d.getFullYear()==t.getFullYear() && d.getMonth()==t.getMonth() && d.getDate()==t.getDate(); }
    function isPast(d){ const t=new Date(); t.setHours(12,0,0,0); return d.getTime() < t.getTime(); }
    function startWeekday(y,m){ let w=new Date(y,m,1,12,0,0).getDay(); return w===0?7:w; } // pon=1

    function parseDate(dateStr) {
      const parts = dateStr.split(/[\s/.]/).filter(Boolean);
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0);
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
    let viewDate = new Date(); viewDate.setDate(1); viewDate.setHours(12,0,0,0);

    function renderMonth(){
      const y=viewDate.getFullYear(), m=viewDate.getMonth();
      elMonthLabel.textContent = new Date(y,m,1,12,0,0).toLocaleDateString("sl-SI", {month:"long",year:"numeric"});
      elCalendarGrid.innerHTML = "";

      const pad = startWeekday(y,m)-1;
      for(let i=0;i<pad;i++){
        const div=document.createElement("div"); div.className="day disabled"; elCalendarGrid.appendChild(div);
      }

      const dim = daysInMonth(y,m);
      for(let d=1; d<=dim; d++){
        const date = new Date(y,m,d,12,0,0);
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
    
    // Funkcija za prikaz informacij o nadomestnem trenerju
    async function showSubstituteTrainerInfo(termId, date) {
        try {
            const { data: substituteData, error } = await supabase
                .from('substitute_trainers')
                .select(`
                    *,
                    original_trainer:trainers!substitute_trainers_original_trainer_id_fkey(first_name, last_name),
                    substitute_trainer:trainers!substitute_trainers_substitute_trainer_id_fkey(first_name, last_name)
                `)
                .eq('term_id', termId)
                .eq('substitute_date', date)
                .single();
            
            if (error && error.code !== 'PGRST116') {
                throw error;
            }
            
            if (substituteData) {
                elSubstituteTrainerInfo.style.display = 'block';
                elSubstituteTrainerName.textContent = `${substituteData.substitute_trainer.first_name} ${substituteData.substitute_trainer.last_name}`;
                elSubstituteTrainerReason.textContent = substituteData.reason || 'Ni razloga';
            } else {
                elSubstituteTrainerInfo.style.display = 'none';
            }
            
        } catch (error) {
            console.error('Napaka pri nalaganju informacij o nadomestnem trenerju:', error);
            elSubstituteTrainerInfo.style.display = 'none';
        }
    }

    // Funkcija za nalaganje prisotnosti trenerja
    async function loadTrainerAttendance(termId, date) {
        try {
            // Najprej poišči trenerja termina
            const { data: trainerData, error: trainerError } = await supabase
                .from('trainer_terms')
                .select('trainer_id')
                .eq('term_id', termId)
                .single();
            
            if (trainerError || !trainerData) {
                console.log('Ni najdenega trenerja za termin:', termId);
                return;
            }
            
            // Preveri, ali je nadomestni trener za ta termin na ta datum
            const { data: substituteData, error: substituteError } = await supabase
                .from('substitute_trainers')
                .select('substitute_trainer_id')
                .eq('term_id', termId)
                .eq('substitute_date', date)
                .single();
            
            let trainerId = trainerData.trainer_id;
            
            // Če je nadomestni trener, uporabi njegov ID
            if (!substituteError && substituteData) {
                trainerId = substituteData.substitute_trainer_id;
            }
            
            // Naloži prisotnost trenerja
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('trainer_attendance')
                .select('*')
                .eq('trainer_id', trainerId)
                .eq('term_id', termId)
                .eq('date', date)
                .single();
            
            if (attendanceError && attendanceError.code !== 'PGRST116') {
                throw attendanceError;
            }
            
            // Nastavi vrednosti
            const trainerPresentCheckbox = document.getElementById('trainerPresentCheckbox');
            const trainerNoteInput = document.getElementById('trainerNoteInput');
            
            if (attendanceData) {
                trainerPresentCheckbox.checked = attendanceData.present;
                trainerNoteInput.value = attendanceData.note || '';
            } else {
                trainerPresentCheckbox.checked = false;
                trainerNoteInput.value = '';
            }
            
            // Dodaj event listenerje
            trainerPresentCheckbox.onchange = () => saveTrainerAttendance(trainerId, termId, date);
            trainerNoteInput.onchange = () => saveTrainerAttendance(trainerId, termId, date);
            
        } catch (error) {
            console.error('Napaka pri nalaganju prisotnosti trenerja:', error);
        }
    }
    
    // Funkcija za shranjevanje prisotnosti trenerja
    async function saveTrainerAttendance(trainerId, termId, date) {
        try {
            const trainerPresentCheckbox = document.getElementById('trainerPresentCheckbox');
            const trainerNoteInput = document.getElementById('trainerNoteInput');
            
            const present = trainerPresentCheckbox.checked;
            const note = trainerNoteInput.value;
            
            // Shrani prisotnost
            const { error: upsertError } = await supabase
                .from('trainer_attendance')
                .upsert({
                    trainer_id: trainerId,
                    term_id: termId,
                    date: date,
                    present: present,
                    note: note
                });
            
            if (upsertError) throw upsertError;
            
            console.log('Prisotnost trenerja shranjena');
            
        } catch (error) {
            console.error('Napaka pri shranjevanju prisotnosti trenerja:', error);
            alert('Napaka pri shranjevanju prisotnosti trenerja');
        }
    }

    // Funkcija za pridobivanje informacij o trenerju termina
    async function getTermTrainerInfo(termId, date) {
        try {
            // Najprej preveri, ali je nadomestni trener za ta termin na ta datum
            const { data: substituteData, error: substituteError } = await supabase
                .from('substitute_trainers')
                .select(`
                    *,
                    substitute_trainer:trainers!substitute_trainers_substitute_trainer_id_fkey(first_name, last_name)
                `)
                .eq('term_id', termId)
                .eq('substitute_date', date)
                .single();
            
            if (!substituteError && substituteData) {
                // Če je nadomestni trener, prikaži njegovo ime
                return `Nadomestni: ${substituteData.substitute_trainer.first_name} ${substituteData.substitute_trainer.last_name}`;
            }
            
            // Če ni nadomestnega trenerja, poišči rednega trenerja termina
            const { data: trainerData, error: trainerError } = await supabase
                .from('trainer_terms')
                .select(`
                    trainer:trainers(first_name, last_name)
                `)
                .eq('term_id', termId)
                .single();
            
            if (!trainerError && trainerData) {
                return `${trainerData.trainer.first_name} ${trainerData.trainer.last_name}`;
            }
            
            return null;
            
        } catch (error) {
            console.error('Napaka pri pridobivanju informacij o trenerju:', error);
            return null;
        }
    }

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

           // Nova funkcija za osvežitev modala (brez odpiranja)
      async function refreshModal() {
        if (!modalCtx || !modalCtx.date || !modalCtx.termId) return;
        
        const ymd = iso(modalCtx.date);
        const termId = modalCtx.termId;
        
        // Osveži samo podatke za ta termin
        const { data, error } = await supabase
          .from('attendance')
          .select('swimmer_id, status')
          .eq('date', ymd)
          .eq('term_id', termId);
        
        if (error) {
          console.error('Napaka pri osveževanju modala:', error);
          return;
        }
        
        // Posodobi lokalne podatke
        const termAtt = data.reduce((acc, row) => {
          acc[row.swimmer_id] = row.status;
          return acc;
        }, {});
        
        attendance[ymd] = { ...attendance[ymd], [termId]: termAtt };
        
        // Osveži samo prikaz v modalu, ne odpiraj ga na novo
        await renderModalContent(modalCtx.date, termId);
      }

     // Nova funkcija za osvežitev vsebine modala (brez odpiranja)
     async function renderModalContent(date, termId) {
       const ymd = iso(date);
       const t = termById(termId);
       if (!t) return;
       
       // Osveži naslov in meta informacije
       elModalTitle.textContent = `${t.label}`;
       
       const trainerInfo = await getTermTrainerInfo(termId, ymd);
       elModalMeta.innerHTML = `
         <span class="chip">${formatDate(ymd)}</span>
         <span class="chip">${DAYNAME[t.day]}</span>
         ${trainerInfo ? `<span class="chip">Trener: ${trainerInfo}</span>` : ''}
       `;
       
       // Osveži tabele prisotnosti
       await refreshModalTables(date, termId);
       
       // Osveži ostale elemente
       await refreshModalOtherElements(date, termId);
     }

     // Funkcija za osvežitev tabel v modalu
     async function refreshModalTables(date, termId) {
       const ymd = iso(date);
       const termAtt = attendance[ymd]?.[termId] || {};
       
       // Osveži tabelo prisotnosti
       await refreshAttendanceTable(date, termId, termAtt);
       
       // Osveži tabelo nadomeščanja
       await refreshSubstitutionTable(date, termId, termAtt);
       
       // Osveži dropdown za dodajanje plavalcev
       await refreshSwimmerDropdown(date, termId);
     }

     // Funkcija za osvežitev tabele prisotnosti
     async function refreshAttendanceTable(date, termId, termAtt) {
       elAttendanceTable.innerHTML = "";
       
       // Redno dodeljeni plavalci
       const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
       
       if (assignedSwimmers.length === 0) {
         const tr = document.createElement("tr");
         const td = document.createElement("td");
         td.colSpan = 2;
         td.className = "muted";
         td.textContent = "Ni dodeljenih plavalcev za ta termin.";
         tr.appendChild(td);
         elAttendanceTable.appendChild(tr);
         return;
       }
       
       assignedSwimmers.sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name))
         .forEach(s => {
           const tr = document.createElement("tr");
           const td1 = document.createElement("td");
           td1.textContent = `${s.first_name} ${s.last_name}`;
           
           const td2 = document.createElement("td");
           td2.style.display = "flex";
           td2.style.gap = "4px";
           td2.style.alignItems = "center";
           
           const status = termAtt[s.id];
           const btnPresent = document.createElement("button");
           btnPresent.textContent = "Prisoten";
           btnPresent.className = "btn";
           if (isInactive(date, termId)) { btnPresent.disabled = true; }
           if (status === true) { btnPresent.classList.add("ok"); } else { btnPresent.classList.add("neutral"); }
           btnPresent.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
             if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               renderMonth();
             }
           });
           
           const btnAbsent = document.createElement("button");
           btnAbsent.textContent = "Odsoten";
           btnAbsent.className = "btn";
           if (isInactive(date, termId)) { btnAbsent.disabled = true; }
           if (status === false) { btnAbsent.classList.add("warn"); } else { btnAbsent.classList.add("neutral"); }
           btnAbsent.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
             if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               refreshSwimmerPanel();
               renderMonth();
             }
           });
           
           const btnRemove = document.createElement("button");
           btnRemove.innerHTML = "✖";
           btnRemove.className = "btn remove-btn";
           if (isInactive(date, termId)) { btnRemove.disabled = true; }
           btnRemove.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .delete()
               .eq('date', ymd)
               .eq('term_id', termId)
               .eq('swimmer_id', s.id);
             if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               refreshSwimmerPanel();
               renderMonth();
             }
           });
           
           tr.appendChild(td1);
           tr.appendChild(td2);
           
           td2.appendChild(btnPresent);
           td2.appendChild(btnAbsent);
           td2.appendChild(btnRemove);
           
           elAttendanceTable.appendChild(tr);
         });
     }

     // Funkcija za osvežitev tabele nadomeščanja
     async function refreshSubstitutionTable(date, termId, termAtt) {
       elSubstitutionTable.innerHTML = "";
       
       // Plavalci z vneseno prisotnostjo, ki NISO redno dodeljeni temu terminu
       const assignedSwimmerIds = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted).map(s => s.id);
       const substitutionSwimmers = Object.keys(termAtt)
         .map(swimmerId => swimmers.find(s => s.id === swimmerId))
         .filter(s => s && !assignedSwimmerIds.includes(s.id) && !s.is_deleted);
       
       if (substitutionSwimmers.length === 0) {
         const tr = document.createElement("tr");
         const td = document.createElement("td");
         td.colSpan = 2;
         td.className = "muted";
         td.textContent = "Ni nadomeščanja.";
         tr.appendChild(td);
         elSubstitutionTable.appendChild(tr);
         return;
       }
       
       substitutionSwimmers.sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name))
         .forEach(s => {
           const tr = document.createElement("tr");
           const td1 = document.createElement("td");
           td1.textContent = `${s.first_name} ${s.last_name}`;
           
           const td2 = document.createElement("td");
           td2.style.display = "flex";
           td2.style.gap = "4px";
           td2.style.alignItems = "center";
           
           const status = termAtt[s.id];
           const btnPresent = document.createElement("button");
           btnPresent.textContent = "Prisoten";
           btnPresent.className = "btn";
           if (isInactive(date, termId)) { btnPresent.disabled = true; }
           if (status === true) { btnPresent.classList.add("ok"); } else { btnPresent.classList.add("neutral"); }
           btnPresent.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
             if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               renderMonth();
             }
           });
           
           const btnAbsent = document.createElement("button");
           btnAbsent.textContent = "Odsoten";
           btnAbsent.className = "btn";
           if (isInactive(date, termId)) { btnAbsent.disabled = true; }
           if (status === false) { btnAbsent.classList.add("warn"); } else { btnAbsent.classList.add("neutral"); }
           btnAbsent.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
             if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               refreshSwimmerPanel();
               renderMonth();
             }
           });
           
           const btnRemove = document.createElement("button");
           btnRemove.innerHTML = "✖";
           btnRemove.className = "btn remove-btn";
           if (isInactive(date, termId)) { btnRemove.disabled = true; }
           btnRemove.addEventListener("click", async () => {
             const { error } = await supabase
               .from('attendance')
               .delete()
               .eq('date', ymd)
               .eq('term_id', termId)
               .eq('swimmer_id', s.id);
             if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
               await refreshDayData(date);
               // NE kliči refreshModal() - to ustvarja neskončno zanko!
               refreshSwimmerPanel();
               renderMonth();
             }
           });
           
           tr.appendChild(td1);
           tr.appendChild(td2);
           
           td2.appendChild(btnPresent);
           td2.appendChild(btnAbsent);
           td2.appendChild(btnRemove);
           
           elSubstitutionTable.appendChild(tr);
         });
     }

     // Funkcija za osvežitev dropdown-a za dodajanje plavalcev
     async function refreshSwimmerDropdown(date, termId) {
       elModalSwimmerSelect.innerHTML = "";
       
       const ymd = iso(date);
       const termAtt = attendance[ymd]?.[termId] || {};
       const allSwimmerIds = Object.keys(termAtt);
       
       const unassigned = swimmers.filter(s => !allSwimmerIds.includes(s.id) && !s.is_deleted)
         .sort((a, b) => (a.last_name + a.first_name).localeCompare(b.last_name + b.first_name));
       
       if (unassigned.length > 0) {
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
     }

     // Funkcija za osvežitev ostalih elementov v modalu
     async function refreshModalOtherElements(date, termId) {
       const ymd = iso(date);
       const termStatusObj = getTermStatus(date, termId);
       
       // Osveži status termina
       if (termStatusObj.status === "inactive") {
         elToggleEventBtn.textContent = "Aktiviraj trening";
         elInactiveNoteText.textContent = termStatusObj.note;
         elInactiveNote.style.display = "block";
       } else {
         elToggleEventBtn.textContent = "Deaktiviraj trening";
         elInactiveNoteText.textContent = "";
         elInactiveNote.style.display = "none";
       }
       
       // Osveži opombe o treningu
       elNotesInput.value = termStatusObj.notes || "";
       
       // Osveži informacije o nadomestnem trenerju
       await showSubstituteTrainerInfo(termId, ymd);
       
       // Osveži prisotnost trenerja
       await loadTrainerAttendance(termId, ymd);
     }


    async function openEvent(date, termId){
      modalCtx = { date:new Date(date.getTime()), termId };
      const t = termById(termId);
      elModalTitle.textContent = `${t.label}`;
      
      // Naloži informacije o trenerju termina
      const trainerInfo = await getTermTrainerInfo(termId, iso(date));
      
      elModalMeta.innerHTML = `
        <span class="chip">${formatDate(iso(date))}</span>
        <span class="chip">${DAYNAME[t.day]}</span>
        ${trainerInfo ? `<span class="chip">Trener: ${trainerInfo}</span>` : ''}
      `;
      
      const ymd = iso(date);
      
             // Ključni popravek: zagotovitev svežih podatkov ob odprtju modala
       await refreshDayData(date);
      
      // Prikaži informacije o nadomestnem trenerju
      await showSubstituteTrainerInfo(termId, ymd);
      
      // Naloži prisotnost trenerja
      await loadTrainerAttendance(termId, ymd);
      
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
      const substitutionSwimmers = swimmersWithAttendance.filter(s => !assignedSwimmerIds.includes(s.id) && !s.is_deleted);
      
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
              // NE kliči openEvent() - to ustvarja neskončno zanko!
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
              // NE kliči openEvent() - to ustvarja neskončno zanko!
              refreshSwimmerPanel();
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
                // NE kliči openEvent() - to ustvarja neskončno zanko!
                refreshSwimmerPanel();
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
              // NE kliči openEvent() - to ustvarja neskončno zanko!
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
              // NE kliči openEvent() - to ustvarja neskončno zanko!
              refreshSwimmerPanel();
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
                // NE kliči openEvent() - to ustvarja neskončno zanko!
                refreshSwimmerPanel();
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
            // NE kliči openEvent() - to ustvarja neskončno zanko!
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
        // NE kliči openEvent() - to ustvarja neskončno zanko!
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
        // NE kliči openEvent() - to ustvarja neskončno zanko!
        refreshSwimmerPanel();
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


    // ===== Panel: upravljanje plavalcev in terminov =====
    async function refreshSwimmerPanel(){
      elSwimmerSelect.innerHTML = "";
      swimmers.slice().filter(s => !s.is_deleted).sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
        const o=document.createElement("option"); o.value=s.id; o.textContent=`${s.first_name} ${s.last_name}`; elSwimmerSelect.appendChild(o);
      });
      showSwimmerInfo();
      renderTermsList();
    }

    function showSwimmerInfo(){
      const sid = elSwimmerSelect.value;
      const s = swimmers.find(x=>x.id===sid);
      if (!s || s.is_deleted) {
        elSwimmerInfo.innerHTML = "";
        elTermSelect.innerHTML = "";
        elAssignTermBtn.disabled = true;
        elDeleteSwimmerBtn.disabled = true;
        return;
      }
    
      const chips = s.terms.map(id => {
        const t = termById(id);
        const termLabel = t ? `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}` : id;
        return `
            <span class="chip" data-term-id="${id}">
                ${termLabel} 
                <button class="remove-term-btn">✖</button>
            </span>
        `;
      }).join(" ");
      elSwimmerInfo.innerHTML = `<div><strong>Termini:</strong> ${chips || "<span class='muted'>ni dodeljenih</span>"}</div>`;
      
      document.querySelectorAll('.remove-term-btn').forEach(button => {
        button.addEventListener('click', async (event) => {
          const chipElement = event.target.closest('.chip');
          if (!chipElement) return;

          const termIdToRemove = chipElement.dataset.termId;
          const swimmerToUpdate = swimmers.find(x => x.id === sid);
          if (!swimmerToUpdate) return;
    
          swimmerToUpdate.terms = swimmerToUpdate.terms.filter(x => x !== termIdToRemove);
    
          const { error } = await supabase
            .from('swimmers')
            .update({ terms: swimmerToUpdate.terms })
            .eq('id', sid);
    
          if (error) {
            alert('Napaka pri odstranjevanju termina.');
            console.error(error);
          } else {
            showSwimmerInfo();
            renderMonth();
            alert("Termin odstranjen in shranjen.");
          }
        });
      });
    
      elTermSelect.innerHTML = "";
      const assignedTermIds = new Set(s.terms);
      const unassignedTerms = TERMS.filter(t => !assignedTermIds.has(t.id));
    
      if (unassignedTerms.length > 0) {
        unassignedTerms.forEach(t => {
          const o = document.createElement("option");
          o.value = t.id;
          o.textContent = t.label;
          elTermSelect.appendChild(o);
        });
        elAssignTermBtn.disabled = false;
      } else {
        const o = document.createElement("option");
        o.textContent = "Vsi termini so že dodeljeni.";
        o.disabled = true;
        elTermSelect.appendChild(o);
        elAssignTermBtn.disabled = true;
      }
      elDeleteSwimmerBtn.disabled = false;
    }
    elSwimmerSelect.addEventListener("change", showSwimmerInfo);

    elAddSwimmerBtn.addEventListener("click", async ()=>{
      const f = elNewFirst.value.trim(), l = elNewLast.value.trim();
      if (!f || !l) { alert("Vnesi ime in priimek."); return; }
      if(swimmers.some(s => s.first_name.toLowerCase() === f.toLowerCase() && s.last_name.toLowerCase() === l.toLowerCase() && !s.is_deleted)) {
        alert("Plavalec s tem imenom že obstaja."); return;
      }
      const newSwimmer = mkSwimmer(f, l, []);
      const { data, error } = await supabase
        .from('swimmers')
        .insert([newSwimmer])
        .select();

      if (error) {
        alert('Napaka pri dodajanju plavalca.');
        console.error(error);
      } else {
        swimmers.push(data[0]);
        elNewFirst.value = ""; elNewLast.value = "";
        refreshSwimmerPanel();
        renderMonth();
        alert("Plavalec uspešno dodan.");
      }
    });

    elAssignTermBtn.addEventListener("click", async ()=>{
      const sid = elSwimmerSelect.value, tid = elTermSelect.value;
      const s = swimmers.find(x=>x.id===sid); if(!s) return;
      if (!s.terms.includes(tid)) s.terms.push(tid);

      const { error } = await supabase
        .from('swimmers')
        .update({ terms: s.terms })
        .eq('id', sid);

      if (error) {
        alert('Napaka pri dodeljevanju termina.');
        console.error(error);
      } else {
        showSwimmerInfo();
        renderMonth();
        alert("Termin dodeljen in shranjen.");
      }
    });
    
    // Funkcija za brisanje plavalca - POSODOBITEV!
    elDeleteSwimmerBtn.addEventListener("click", async () => {
      const sid = elSwimmerSelect.value;
      if (!sid) {
        alert("Prosim, izberite plavalca, ki ga želite izbrisati.");
        return;
      }

      try {
        const today = iso(new Date());

        const { error: attError } = await supabase
          .from('attendance')
          .delete()
          .eq('swimmer_id', sid)
          .gte('date', today);

        if (attError) throw attError;

        const { error: swimmerError } = await supabase
          .from('swimmers')
          .update({ is_deleted: true })
          .eq('id', sid);

        if (swimmerError) throw swimmerError;
        
        const deletedSwimmer = swimmers.find(s => s.id === sid);
        if (deletedSwimmer) {
            deletedSwimmer.is_deleted = true;
        }
        
        await refreshSwimmerPanel();
        await renderMonth();
        alert("Plavalec uspešno izbrisan.");
      } catch (error) {
        console.error("Napaka pri brisanju plavalca:", error);
        alert("Napaka pri brisanju plavalca. Prosim, preverite konzolo za podrobnosti. Morda gre za težavo z dovolilnicami v Supabase.");
      }
    });


    // ===== NOV TERMIN - DODANA FUNKCIJA =====
    elAddTermBtn.addEventListener("click", async ()=>{
      const day = parseInt(elNewTermDay.value, 10);
      const start = elNewTermStart.value;
      const end = elNewTermEnd.value;
      const dateFrom = parseDate(elNewTermDateFrom.value);
      const dateTo = parseDate(elNewTermDateTo.value);

      if (!day || !start || !end || !dateFrom || !dateTo) {
        alert("Prosim, izpolni vsa polja in preveri format datuma (dd / mm / yyyy).");
        return;
      }

      // Popravi formatiranje ID-ja termina - dodaj pomišljaj med uro in minuto
      const startFormatted = start.replace(':', '-');
      const endFormatted = end.replace(':', '-');
      const newTermId = `${DAYNAME[day].toLowerCase().slice(0,3)}-${startFormatted}-${endFormatted}`;
      const newLabel = `${DAYNAME[day]} ${start}–${end}`;

      const newTerm = {
        id: newTermId,
        day: day,
        start_time: start,
        end_time: end,
        label: newLabel,
        date_from: dateFrom,
        date_to: dateTo
      };

      const { data, error } = await supabase
        .from('terms')
        .upsert([newTerm]);

      if (error) {
        alert("Napaka pri dodajanju termina. Morda že obstaja ID s to kombinacijo dneva in časa.");
        console.error(error);
      } else {
        TERMS.push(newTerm);
        elNewTermStart.value = "";
        elNewTermEnd.value = "";
        elNewTermDateFrom.value = "";
        elNewTermDateTo.value = "";

        await refreshSwimmerPanel();
        await renderMonth();
        alert("Nov termin uspešno dodan!");
      }
    });

    // ===== UREJANJE TERMINOV - SPREMENJENA FUNKCIJA =====
    let editingTermId = null;

    function renderTermsList() {
      elTermList.innerHTML = "";
      
      const activeTerms = TERMS.filter(t => !isPast(new Date(t.date_to)));
      
      if(activeTerms.length === 0){
        elTermList.textContent = "Ni aktivnih terminov.";
        elTermList.style.color = "var(--mut)";
        return;
      }
      elTermList.style.color = "inherit";

      activeTerms.forEach(t => {
        const div = document.createElement("div");
        div.className = "term-item";

        const infoDiv = document.createElement("div");
        infoDiv.className = "term-item-info";

        const labelSpan = document.createElement("span");
        labelSpan.className = "term-item-label";
        labelSpan.textContent = `${DAY_SHORT_NAME[t.day]} ${t.start_time.slice(0, 5)}–${t.end_time.slice(0, 5)}`;
        
        const datesSpan = document.createElement("span");
        datesSpan.className = "term-item-dates";
        datesSpan.textContent = `Od: ${formatDate(t.date_from)}, do: ${formatDate(t.date_to)}`;

        infoDiv.appendChild(labelSpan);
        infoDiv.appendChild(datesSpan);
        div.appendChild(infoDiv);

        const actionsDiv = document.createElement("div");
        
        const editBtn = document.createElement("button");
        editBtn.innerHTML = "Uredi";
        editBtn.className = "btn neutral";
        editBtn.style.marginRight = "6px";
        editBtn.onclick = () => openEditTermModal(t.id);
        actionsDiv.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "✖";
        deleteBtn.className = "btn remove-btn";
        deleteBtn.onclick = () => deleteTerm(t.id);
        actionsDiv.appendChild(deleteBtn);

        div.appendChild(actionsDiv);

        elTermList.appendChild(div);
      });
    }

    // Prikaži seznam trenerjev
    async function renderTrainersList() {
      elTrainersList.innerHTML = '';
      
      if (trainers.length === 0) {
        elTrainersList.innerHTML = '<p class="muted">Ni trenerjev v sistemu.</p>';
        return;
      }

      // Naloži prisotnost trenerjev za trenutni mesec
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      try {
        const { data: attendanceData, error } = await supabase
          .rpc('get_trainer_attendance_summary', {
            year_param: currentYear,
            month_param: currentMonth
          });
        
        if (error) {
          console.error('Napaka pri nalaganju prisotnosti trenerjev:', error);
        }
        
        const attendanceMap = {};
        if (attendanceData) {
          attendanceData.forEach(record => {
            attendanceMap[record.trainer_id] = {
              present: record.present_count || 0,
              total: record.total_sessions || 0
            };
          });
        }

        trainers.forEach(trainer => {
          const attendance = attendanceMap[trainer.id] || { present: 0, total: 0 };
          const percentage = attendance.total > 0 ? ((attendance.present / attendance.total) * 100).toFixed(1) : 0;
          
          const div = document.createElement('div');
          div.className = 'trainer-item';
          div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;';
          div.innerHTML = `
            <div class="trainer-info">
              <strong>${trainer.first_name} ${trainer.last_name}</strong>
              <br>
              <small class="muted">${trainer.email}</small>
              <br>
              <small class="muted">Prisotnost: ${attendance.present}/${attendance.total} (${percentage}%)</small>
            </div>
            <div class="trainer-actions">
              <a href="assign-terms.html" class="btn small">Dodeli termine</a>
            </div>
          `;
          elTrainersList.appendChild(div);
        });
      } catch (error) {
        console.error('Napaka pri nalaganju prisotnosti trenerjev:', error);
        
        // Prikaži trenerje brez prisotnosti
        trainers.forEach(trainer => {
          const div = document.createElement('div');
          div.className = 'trainer-item';
          div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;';
          div.innerHTML = `
            <div class="trainer-info">
              <strong>${trainer.first_name} ${trainer.last_name}</strong>
              <br>
              <small class="muted">${trainer.email}</small>
            </div>
            <div class="trainer-actions">
              <a href="assign-terms.html" class="btn small">Dodeli termine</a>
            </div>
          `;
          elTrainersList.appendChild(div);
        });
      }
    }

    async function deleteTerm(termId) {
        if (!confirm("Ali ste prepričani, da želite izbrisati ta termin?")) {
            return;
        }

        const { error: statusError } = await supabase
            .from('term_status')
            .delete()
            .eq('term_id', termId);
        
        if (statusError) { console.error("Napaka pri brisanju statusa termina:", statusError); alert("Napaka pri brisanju statusa termina. Preverite konzolo."); return; }

        const { error: termError } = await supabase
            .from('terms')
            .delete()
            .eq('id', termId);

        if (termError) { console.error("Napaka pri brisanju termina:", termError); alert("Napaka pri brisanju termina. Preverite konzolo."); return; }
        
        for (const swimmer of swimmers) {
          if (swimmer.terms.includes(termId)) {
            swimmer.terms = swimmer.terms.filter(t => t !== termId);
            await supabase.from('swimmers').update({ terms: swimmer.terms }).eq('id', swimmer.id);
          }
        }
        
        TERMS = TERMS.filter(t => t.id !== termId);
        await refreshSwimmerPanel();
        await renderMonth();
        alert("Termin uspešno izbrisan. Zgodovina obiskov je ohranjena.");
    }

    function openEditTermModal(termId) {
      editingTermId = termId;
      const term = termById(termId);
      if (!term) return;

      elEditTermModalTitle.textContent = `Uredi termin: ${term.label}`;
      elEditTermDateFrom.value = formatDate(term.date_from);
      elEditTermDateTo.value = formatDate(term.date_to);

      openModal(elEditTermModal);
    }

    elCloseEditTermModalBtn.addEventListener("click", () => closeModal(elEditTermModal));
    elEditTermModal.addEventListener("click", (e) => { if (e.target === elEditTermModal) closeModal(elEditTermModal); });
    elSaveEditTermBtn.addEventListener("click", async () => {
      const term = termById(editingTermId);
      if (!term) return;

      const newDateFrom = parseDate(elEditTermDateFrom.value);
      const newDateTo = parseDate(elEditTermDateTo.value);

      if (!newDateFrom || !newDateTo) {
        alert("Prosim, izpolnite oba datuma v pravilnem formatu (dd / mm / yyyy).");
        return;
      }
      
      const { error } = await supabase
        .from('terms')
        .update({ date_from: newDateFrom, date_to: newDateTo })
        .eq('id', editingTermId);

      if (error) {
        alert("Napaka pri posodabljanju termina.");
        console.error(error);
      } else {
        term.date_from = newDateFrom;
        term.date_to = newDateTo;
        closeModal(elEditTermModal);
        await renderTermsList();
        await renderMonth();
        alert("Termin uspešno posodobljen.");
      }
    });

    // ===== CSV: uvoz plavalcev z možnostjo prepisa od danes naprej - SPREMENJENA LOGIKA =====
    elCsvInput.addEventListener("change", async (e)=>{
      const file = e.target.files[0]; if(!file) return;
      const txt = await file.text();
      const lines = txt.split(/\r?\n/).filter(x=>x.trim().length > 0);
      if(lines.length < 2) { alert("CSV je prazen ali napačno oblikovan."); return; }
      const header = lines[0].split(",").map(h => h.trim());
      const idxFirst = header.findIndex(h => h === "first_name");
      const idxLast = header.findIndex(h => h === "last_name");
      const termIdx = header.findIndex(h => h === "terms");

      if (idxFirst === -1 || idxLast === -1 || termIdx === -1) {
          alert("CSV mora imeti stolpce 'first_name', 'last_name' in 'terms'.");
      }

      const today = iso(new Date());
      let importedSwimmers = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = splitCsvLine(lines[i]); if (cols.length < termIdx) continue;
        const first = (cols[idxFirst] || "").trim();
        const last = (cols[idxLast] || "").trim();
        if (!first || !last) continue;
        const csvTermsRaw = (cols[termIdx] || "").split(",").map(t => t.trim()).filter(Boolean);
        const csvTerms = csvTermsRaw.filter(id => TERMS.some(t => t.id === id));
        importedSwimmers.push({ first_name: first, last_name: last, terms: [...new Set(csvTerms)] });
      }

      if (importedSwimmers.length === 0) {
        alert("Ni plavalcev za uvoz.");
        return;
      }

      const { data: existingSwimmers, error: fetchError } = await supabase
        .from('swimmers')
        .select('id, first_name, last_name, is_deleted');
        
      if (fetchError) {
          console.error("Napaka pri nalaganju plavalcev:", fetchError);
          alert("Napaka pri nalaganju plavalcev. Preverite konzolo.");
          return;
      }

      const updates = [];
      const inserts = [];

      importedSwimmers.forEach(sData => {
        const existing = existingSwimmers.find(s => s.first_name.toLowerCase() === sData.first_name.toLowerCase() && s.last_name.toLowerCase() === sData.last_name.toLowerCase() && !s.is_deleted);
        
        if (existing) {
          updates.push({ id: existing.id, terms: sData.terms });
        } else {
          inserts.push(sData);
        }
      });
      
      const { error: insertError } = await supabase.from('swimmers').insert(inserts);
      if (insertError) { console.error("Napaka pri vstavljanju novih plavalcev:", insertError); alert("Napaka pri vstavljanju novih plavalcev."); return; }

      for (const update of updates) {
        const { error } = await supabase.from('swimmers').update({ terms: update.terms }).eq('id', update.id);
        if (error) { console.error("Napaka pri posodabljanju plavalca:", error); }
      }
      
      const { error: attError } = await supabase.from('attendance').delete().gte('date', today);
      const { error: statusError } = await supabase.from('term_status').delete().gte('date', today);

      if (attError || statusError) {
          console.warn("Opozorilo: Napaka pri čiščenju zgodovine od danes naprej.", attError, statusError);
      }
      
      await loadDataFromSupabase();
      await refreshSwimmerPanel();
      await renderMonth();
      alert(`Uvoz končan. Uvoženih plavalcev: ${importedSwimmers.length}. Vse nastavitve plavalcev so posodobljene.`);
      e.target.value = "";
    });

    // ===== CSV: uvoz terminov - NOVA FUNKCIJA =====
    elCsvTermsInput.addEventListener("change", async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const txt = await file.text();
        const lines = txt.split(/\r?\n/).filter(x => x.trim().length > 0);
        if (lines.length < 2) { alert("CSV je prazen ali napačno oblikovan."); return; }
        
        const header = lines[0].split(",").map(h => h.trim());
        const idxId = header.findIndex(h => h === "id");
        const idxDay = header.findIndex(h => h === "day");
        const idxStart = header.findIndex(h => h === "start_time");
        const idxEnd = header.findIndex(h => h === "end_time");
        const idxFrom = header.findIndex(h => h === "date_from");
        const idxTo = header.findIndex(h => h === "date_to");

        if (idxId === -1 || idxDay === -1 || idxStart === -1 || idxEnd === -1 || idxFrom === -1 || idxTo === -1) {
            alert("CSV mora vsebovati stolpce 'id', 'day', 'start_time', 'end_time', 'date_from' in 'date_to'.");
            return;
        }

        let importedTerms = [];
        let errors = [];

        for (let i = 1; i < lines.length; i++) {
            const cols = splitCsvLine(lines[i]);
            if (cols.length < 6) continue;

            const id = (cols[idxId] || "").trim();
            const day = parseInt(cols[idxDay], 10);
            const start = (cols[idxStart] || "").trim();
            const end = (cols[idxEnd] || "").trim();
            const dateFrom = parseDate(cols[idxFrom] || "");
            const dateTo = parseDate(cols[idxTo] || "");

            if (!id || isNaN(day) || !start || !end || !dateFrom || !dateTo) {
                errors.push(`Vrsta ${i+1}: manjkajoči podatki ali napačen format.`);
                continue;
            }

            const label = `${DAYNAME[day]} ${start}–${end}`;
            importedTerms.push({ id, day, start_time: start, end_time: end, label, date_from: dateFrom, date_to: dateTo });
        }
        
        if (errors.length > 0) {
            alert("Napake pri uvozu: \n" + errors.join("\n"));
            return;
        }

        const { error } = await supabase
            .from('terms')
            .upsert(importedTerms);
        
        if (error) {
            alert("Napaka pri uvozu terminov.");
            console.error(error);
        } else {
            await loadDataFromSupabase();
            await refreshSwimmerPanel();
            await renderMonth();
            alert("Termini uspešno uvoženi in posodobljeni!");
        }
        e.target.value = "";
    });

    // Dodatna funkcija za pravilno branje CSV vrstic z vejicami v poljih
    function splitCsvLine(line) {
      const result = [];
      let inQuotes = false;
      let currentField = '';
      for (let i = 1; i < line.length; i++) {
        const char = line[i];
        const prevChar = line[i-1];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      result.push(currentField.trim());
      return result;
    }


    // ===== UPRAVLJANJE DATUMA =====
    elPrev.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonth(); });
    elNext.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonth(); });
    
    // NOVO: Gumb za ročno osveževanje podatkov iz trener portala
    const elRefreshBtn = document.getElementById("refreshBtn");
    elRefreshBtn.addEventListener("click", async () => {
      try {
        elRefreshBtn.disabled = true;
        elRefreshBtn.textContent = "Osveževanje...";
        
        // Osveži podatke za trenutni mesec
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        
        // Osveži podatke za vse datume v trenutnem mesecu
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        for (let day = 1; day <= daysInCurrentMonth; day++) {
          const date = new Date(currentYear, currentMonth, day);
          await refreshDayData(date);
        }
        
        // Posodobi kalendar in povzetek
        renderMonth();
        
                 // NOVO: Če je modal odprt, osveži tudi modal
         if (modalCtx && modalCtx.date && modalCtx.termId) {
           console.log('Ročno osveževanje modala za termin:', modalCtx.termId);
           await refreshModal();
         }
        
        console.log('Podatki ročno osveženi');
      } catch (error) {
        console.error('Napaka pri ročnem osveževanju:', error);
        alert('Napaka pri osveževanju podatkov');
      } finally {
        elRefreshBtn.disabled = false;
        elRefreshBtn.textContent = "🔄 Osveži";
      }
    });

    // ===== EXPORT CSV - DODANA FUNKCIJA =====
    function populateExportSelects() {
        const year = new Date().getFullYear();
        elExportYearSelect.innerHTML = `<option>${year}</option><option>${year-1}</option>`;
        elExportTrainerYearSelect.innerHTML = `<option>${year}</option><option>${year-1}</option>`;
        const months = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
        elExportMonthSelect.innerHTML = months.map((m,i)=>`<option value="${i}">${m}</option>`).join("");
        elExportTrainerMonthSelect.innerHTML = months.map((m,i)=>`<option value="${i}">${m}</option>`).join("");
        elExportMonthSelect.value = new Date().getMonth();
        elExportTrainerMonthSelect.value = new Date().getMonth();
    }

    elExportCsvBtn.addEventListener("click", ()=>{
        const month = parseInt(elExportMonthSelect.value, 10);
        const year = parseInt(elExportYearSelect.value, 10);
        const summary = calculateSummaryData(year, month);
        
        // POPRAVEK: Dodamo BOM za pravilno kodiranje UTF-8
        let csv = "\uFEFFfirst_name,last_name,attended,possible,percentage\n";
        // Popravljeno: izvažamo vse plavalce, ne glede na to, ali imajo možne obiske
        const rows = Object.values(summary).sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first));
        rows.forEach(r=>{
            const pct = r.pos > 0 ? (r.att / r.pos * 100).toFixed(1) : "0.0";
            csv += `${r.first},${r.last},${r.att},${r.pos},${pct}\n`;
        });
        
        const filename = `prisostnost_${year}-${String(month+1).padStart(2,'0')}.csv`;
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Event listener za izvoz prisotnosti trenerjev
    elExportTrainerCsvBtn.addEventListener("click", async () => {
        const month = parseInt(elExportTrainerMonthSelect.value, 10);
        const year = parseInt(elExportTrainerYearSelect.value, 10);
        
        try {
            const { data: attendanceData, error } = await supabase
                .rpc('get_trainer_attendance_summary', {
                    year_param: year,
                    month_param: month + 1
                });
            
            if (error) throw error;
            
            // POPRAVEK: Dodamo BOM za pravilno kodiranje UTF-8
            let csv = "\uFEFFtrainer_id,total_sessions,present_count\n";
            
            if (attendanceData && attendanceData.length > 0) {
                attendanceData.forEach(trainer => {
                    const percentage = trainer.total_sessions > 0 ? ((trainer.present_count / trainer.total_sessions) * 100).toFixed(1) : 0;
                    csv += `${trainer.trainer_id},${trainer.total_sessions},${trainer.present_count}\n`;
                });
            }
            
            const filename = `prisostnost_trenerjev_${year}-${String(month+1).padStart(2,'0')}.csv`;
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Napaka pri izvozu prisotnosti trenerjev:', error);
            alert('Napaka pri izvozu prisotnosti trenerjev');
        }
    });

    // ===== Inicializacija vseh podatkov iz Supabase =====
    async function loadDataFromSupabase(){
      try {
        const { data: termsData, error: termsError } = await supabase.from('terms').select('*');
        if (termsError) throw termsError;
        TERMS = termsData;
        
        // ZDAJ NALOŽIMO VSE PLAVALCE, DA ZADRŽIMO ZGODOVINSKE PODATKE
        const { data: swimmersData, error: swimmersError } = await supabase.from('swimmers').select('*');
        if (swimmersError) throw swimmersError;
        swimmers = swimmersData;
        
        // Naloži trenerje
        const { data: trainersData, error: trainersError } = await supabase.from('trainers').select('*').order('first_name, last_name');
        if (trainersError) throw trainersError;
        trainers = trainersData || [];
        
        // Naloži nadomestne trenerje
        await loadSubstituteTrainers();
        
        const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*');
        if (attendanceError) throw attendanceError;
        attendance = attendanceData.reduce((acc, row) => {
          acc[row.date] = acc[row.date] || {};
          acc[row.date][row.term_id] = acc[row.date][row.term_id] || {};
          acc[row.date][row.term_id][row.swimmer_id] = row.status;
          return acc;
        }, {});
        
        const { data: statusData, error: statusError } = await supabase.from('term_status').select('*');
        if (statusError) throw statusError;
        termStatus = statusData.reduce((acc, row) => {
          acc[row.date] = acc[row.date] || {};
          acc[row.date][row.term_id] = { status: row.status, note: row.note, notes: row.notes };
          return acc;
        }, {});

        populateExportSelects();
        refreshSwimmerPanel();
        await renderTrainersList();
        await loadSubstituteTrainers();
        renderMonth();
        renderTrainerAttendance();

      } catch (error) {
        console.error("Napaka pri nalaganju podatkov:", error);
        alert("Napaka pri nalaganju podatkov iz baze. Preverite konzolo za podrobnosti.");
      }
    }

    // Funkcija za prikaz prisotnosti trenerjev
    async function renderTrainerAttendance() {
        try {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            
            const { data: attendanceData, error } = await supabase
                .rpc('get_trainer_attendance_summary', {
                    year_param: currentYear,
                    month_param: currentMonth
                });
            
            if (error) throw error;
            
            if (attendanceData && attendanceData.length > 0) {
                let html = '<table><thead><tr><th>Trener</th><th>Skupaj terminov</th><th>Prisotni</th><th>Delež (%)</th></tr></thead><tbody>';
                
                attendanceData.forEach(trainer => {
                    const trainerInfo = trainers.find(t => t.id === trainer.trainer_id);
                    const trainerName = trainerInfo ? `${trainerInfo.first_name} ${trainerInfo.last_name}` : 'Neznan trener';
                    const percentage = trainer.total_sessions > 0 ? ((trainer.present_count / trainer.total_sessions) * 100).toFixed(1) : 0;
                    
                    html += `<tr>
                        <td>${trainerName}</td>
                        <td>${trainer.total_sessions}</td>
                        <td>${trainer.present_count}</td>
                        <td>${percentage}%</td>
                    </tr>`;
                });
                
                html += '</tbody></table>';
                elTrainerAttendanceList.innerHTML = html;
            } else {
                elTrainerAttendanceList.innerHTML = '<p class="muted">Ni podatkov o prisotnosti trenerjev za trenutni mesec.</p>';
            }
            
        } catch (error) {
            console.error('Napaka pri nalaganju prisotnosti trenerjev:', error);
            elTrainerAttendanceList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov o prisotnosti trenerjev.</p>';
        }
    }

         // Začetni zagon
     loadDataFromSupabase();
     
     // NOVO: Avtomatsko osveževanje kalendarja vsakih 30 sekund, da se prikaže prisotnost iz trener portala
     setInterval(async () => {
       try {
         // Osveži podatke za trenutni mesec
         const currentDate = new Date();
         const currentMonth = currentDate.getMonth();
         const currentYear = currentDate.getFullYear();
         
         // Osveži podatke za vse datume v trenutnem mesecu
         const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
         for (let day = 1; day <= daysInCurrentMonth; day++) {
           const date = new Date(currentYear, currentMonth, day);
           await refreshDayData(date);
         }
         
         // Posodobi kalendar
         renderMonth();
         
                    // NOVO: Če je modal odprt, osveži tudi modal
           if (modalCtx && modalCtx.date && modalCtx.termId) {
             console.log('Avtomatsko osveževanje modala za termin:', modalCtx.termId);
             await refreshModal();
           }
         
         console.log('Kalendar in modal avtomatsko osveženi');
       } catch (error) {
         console.error('Napaka pri avtomatskem osveževanju kalendarja:', error);
       }
     }, 30000); // 30 sekund
     
     // Naloži nadomestne trenerje
     async function loadSubstituteTrainers() {
      try {
        const { data: substituteData, error } = await supabase
          .from('substitute_trainers')
          .select(`
            *,
            original_trainer:trainers!substitute_trainers_original_trainer_id_fkey(first_name, last_name, email),
            substitute_trainer:trainers!substitute_trainers_substitute_trainer_id_fkey(first_name, last_name, email),
            term:terms(id, day, start_time, end_time)
          `)
          .order('substitute_date', { ascending: false });
        
        if (error) throw error;
        
        const elSubstituteTrainersList = document.getElementById('substituteTrainersList');
        
        if (substituteData && substituteData.length > 0) {
          const html = substituteData.map(sub => `
            <div class="substitute-item" style="border: 1px solid #007bff; padding: 12px; margin: 8px 0; border-radius: 6px; background: #f8f9fa;">
              <div><strong>Termin:</strong> ${DAYNAME[sub.term.day]} ${sub.term.start_time.slice(0, 5)}-${sub.term.end_time.slice(0, 5)}</div>
              <div><strong>Datum:</strong> ${new Date(sub.substitute_date).toLocaleDateString('sl-SI')}</div>
              <div><strong>Originalni trener:</strong> ${sub.original_trainer.first_name} ${sub.original_trainer.last_name}</div>
              <div><strong>Nadomestni trener:</strong> ${sub.substitute_trainer.first_name} ${sub.substitute_trainer.last_name}</div>
              <div><strong>Razlog:</strong> ${sub.reason || 'Ni razloga'}</div>
              <div class="muted">Ustvarjeno: ${new Date(sub.created_at).toLocaleDateString('sl-SI')}</div>
            </div>
          `).join('');
          
          elSubstituteTrainersList.innerHTML = html;
        } else {
          elSubstituteTrainersList.innerHTML = '<p class="muted">Ni nadomestnih dogovorov</p>';
        }
        
              } catch (error) {
          console.error('Napaka pri nalaganju nadomestnih trenerjev:', error);
          const elSubstituteTrainersList = document.getElementById('substituteTrainersList');
          elSubstituteTrainersList.innerHTML = '<p class="error">Napaka pri nalaganju podatkov</p>';
        }
      }
    });