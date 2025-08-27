// Počakamo, da se celotna stran naloži
document.addEventListener('DOMContentLoaded', () => {

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
    const elNewFirst = document.getElementById("newFirst");
    const elNewLast = document.getElementById("newLast");
    const elAddSwimmerBtn = document.getElementById("addSwimmerBtn");
    const elSwimmerSelect = document.getElementById("swimmerSelect");
    const elTermSelect = document.getElementById("termSelect");
    const elAssignTermBtn = document.getElementById("assignTermBtn");
    const elDeleteSwimmerBtn = document.getElementById("deleteSwimmerBtn"); 
    const elSwimmerInfo = document.getElementById("swimmerInfo");
    const elCsvInput = document.getElementById("csvInput");
    const elCsvTermsInput = document.getElementById("csvTermsInput");
    const elExportMonthSelect = document.getElementById("exportMonthSelect");
    const elExportYearSelect = document.getElementById("exportYearSelect");
    const elExportCsvBtn = document.getElementById("exportCsvBtn");
    const elNewTermDay = document.getElementById("newTermDay");
    const elNewTermStart = document.getElementById("newTermStart");
    const elNewTermEnd = document.getElementById("newTermEnd");
    const elNewTermDateFrom = document.getElementById("newTermDateFrom");
    const elNewTermDateTo = document.getElementById("newTermDateTo");
    const elAddTermBtn = document.getElementById("addTermBtn");
    const elTermList = document.getElementById("termList");
    const elModal = document.getElementById("eventModal");
    const elModalTitle = document.getElementById("modalTitle");
    const elModalMeta = document.getElementById("modalMeta");
    const elAttendanceTable = document.getElementById("attendanceTable"); // Popravljena vrstica
    const elToggleEventBtn = document.getElementById("toggleEventBtn");
    const elCloseModalBtn = document.getElementById("closeModalBtn");
    const elModalSwimmerSelect = document.getElementById("modalSwimmerSelect");
    const elAddToEventBtn = document.getElementById("addToEventBtn");
    const elInactiveNote = document.getElementById("inactiveNote");
    const elNotesInput = document.getElementById("notesInput");
    const elSaveNotesBtn = document.getElementById("saveNotesBtn");
    const elDayModal = document.getElementById("dayModal");
    const elDayModalTitle = document.getElementById("dayModalTitle");
    const elDayModalList = document.getElementById("dayModalList");
    const elCloseDayModalBtn = document.getElementById("closeDayModalBtn");
    const elEditTermModal = document.getElementById("editTermModal");
    const elEditTermModalTitle = document.getElementById("editTermModalTitle");
    const elEditTermDateFrom = document.getElementById("editTermDateFrom");
    const elEditTermDateTo = document.getElementById("editTermDateTo");
    const elSaveEditTermBtn = document.getElementById("saveEditTermBtn");
    const elCloseEditTermModalBtn = document.getElementById("closeEditTermModalBtn");
    const elNoteModal = document.getElementById("noteModal");
    const elNoteInput = document.getElementById("noteInput");
    const elCancelNoteBtn = document.getElementById("cancelNoteBtn");
    const elConfirmNoteBtn = document.getElementById("confirmNoteBtn");
    const elCloseNoteModalBtn = document.getElementById("closeNoteModalBtn");


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

    function getAttendanceStatus(date, termId) {
        const ymd = iso(date);
        
        const assignedSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted);
        const assignedSwimmerIds = assignedSwimmers.map(s => s.id);
        
        const termAtt = attendance[ymd]?.[termId] || {};
        
        const markedAssignedSwimmersCount = assignedSwimmerIds.filter(id => termAtt.hasOwnProperty(id)).length;
        
        const totalAssignedCount = assignedSwimmers.length;

        if (totalAssignedCount === 0) {
            return 'complete'; 
        } else if (markedAssignedSwimmersCount === 0) {
            return 'unfilled';
        } else if (markedAssignedSwimmersCount === totalAssignedCount) {
            return 'complete';
        } else {
            return 'partial';
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

          if (isPast(date) || isToday(date)) {
            const status = getAttendanceStatus(date, t.id);
            e.classList.add(status);
          }
          
          if (isInactive(date, t.id)) {
              e.classList.add("disabled");
          }
          
          e.innerHTML = `<span class="time">${t.start_time.slice(0, 5)}<span class="end-time">–${t.end_time.slice(0, 5)}</span></span>`;

          e.title = t.label;
          e.dataset.termId = t.id;
          day.appendChild(e);
        });

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
        
        // Prikaz "več dogodkov" samo, če se ne prikažejo vsi
        if (window.innerWidth <= 768 && todays.length > 2) {
          const more = document.createElement("div");
          more.className = "more-events-indicator";
          more.textContent = `+ ${todays.length - 2} več...`;
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
          
          if (isPast(date) || isToday(date)) {
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
      elModalMeta.innerHTML = "";
      
      const ymd = iso(date);
      
      await refreshDayData(date);
      
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
      
      attendance[ymd] = { ...attendance[ymd], [termId]: termAtt };

      const swimmersWithAttendance = Object.keys(termAtt).map(swimmerId => swimmers.find(s => s.id === swimmerId)).filter(Boolean);
      const assignedActiveSwimmers = swimmers.filter(s => s.terms.includes(termId) && !s.is_deleted && !termAtt[s.id]);
      const allSwimmersForEvent = [...new Set([...swimmersWithAttendance, ...assignedActiveSwimmers])];
      
      elAttendanceTable.innerHTML = "";
      if(allSwimmersForEvent.length===0){
        const tr=document.createElement("tr");
        const td=document.createElement("td"); td.colSpan=2; td.className="muted"; td.textContent="Ni dodeljenih plavalcev za ta termin.";
        tr.appendChild(td); elAttendanceTable.appendChild(tr);
      } else {
        allSwimmersForEvent.sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name)).forEach(s=>{
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
          
          const btnAbsent = document.createElement("button");
          btnAbsent.textContent = "Odsoten";
          btnAbsent.className = "btn";
          if (isInactive(date, termId)) { btnAbsent.disabled = true; }

          if (status === true) {
              btnPresent.classList.add("ok");
              btnAbsent.classList.add("neutral");
          } else if (status === false) {
              btnAbsent.classList.add("warn");
              btnPresent.classList.add("neutral");
          } else {
              btnPresent.classList.add("neutral");
              btnAbsent.classList.add("neutral");
          }

          btnPresent.addEventListener("click", async ()=>{
            btnAbsent.classList.remove("warn");
            btnPresent.classList.add("ok");
            btnPresent.classList.remove("neutral");
            btnAbsent.classList.add("neutral");
            
            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: true }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
            if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              await refreshDayData(date);
              openEvent(date, termId);
              renderMonth();
            }
          });
          
          btnAbsent.addEventListener("click", async ()=>{
            btnPresent.classList.remove("ok");
            btnAbsent.classList.add("warn");
            btnAbsent.classList.remove("neutral");
            btnPresent.classList.add("neutral");

            const { error } = await supabase
              .from('attendance')
              .upsert({ date: ymd, term_id: termId, swimmer_id: s.id, status: false }, { onConflict: ['date', 'term_id', 'swimmer_id'] });
          if (error) { console.error('Napaka pri posodabljanju prisotnosti:', error); } else {
              await refreshDayData(date);
              openEvent(date, termId);
              refreshSwimmerPanel();
              renderMonth();
            }
          });
          
          const btnRemove = document.createElement("button");
          btnRemove.innerHTML = "✖";
          btnRemove.className = "btn remove-btn";
          if (isInactive(date, termId)) { btnRemove.disabled = true; }
          btnRemove.addEventListener("click", async ()=>{
              btnPresent.classList.remove("ok");
              btnAbsent.classList.remove("warn");
              btnPresent.classList.add("neutral");
              btnAbsent.classList.add("neutral");

              const { error } = await supabase
                .from('attendance')
                .delete()
                .eq('date', ymd)
                .eq('term_id', termId)
                .eq('swimmer_id', s.id);
            if (error) { console.error('Napaka pri brisanju prisotnosti:', error); } else {
                await refreshDayData(date);
                openEvent(date, termId);
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

      elModalSwimmerSelect.innerHTML = "";
      const currentEventSwimmerIds = allSwimmersForEvent.map(s => s.id);
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
        o.textContent = "Vsi plavalci so že dodeljeni.";
        o.disabled = true;
        elModalSwimmerSelect.appendChild(o);
        elAddToEventBtn.style.display = "none";
        elModalSwimmerSelect.style.display = "none";
      }

      const termStatusObj = getTermStatus(date, termId);
      if (termStatusObj.status === "inactive") {
        elToggleEventBtn.textContent = "Aktiviraj trening";
        elInactiveNote.textContent = termStatusObj.note;
        elInactiveNote.style.display = "block";
      } else {
        elToggleEventBtn.textContent = "Deaktiviraj trening";
        elInactiveNote.textContent = "";
        elInactiveNote.style.display = "none";
      }
      elNotesInput.value = termStatusObj.notes || "";
      elSaveNotesBtn.textContent = "Shrani opombo";
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

      elCancelNoteBtn.onclick = () => {
        closeModal(elNoteModal);
      };

      elCloseNoteModalBtn.onclick = () => {
        closeModal(elNoteModal);
      };
      
      elNoteModal.addEventListener("click", (e) => {
        if (e.target === elNoteModal) {
          closeModal(elNoteModal);
        }
      });
      openModal(elModal);
    }
    
    // POSODOBLJENA FUNKCIJA ZA ODPRANJE MODALA
    function openModal(modalEl){
      modalEl.classList.add("show");
      modalEl.setAttribute("aria-hidden", "false");
    }
    
    // POSODOBLJENA FUNKCIJA ZA ZAPIRANJE MODALA
    function closeModal(modalEl){
      modalEl.classList.remove("show");
      modalEl.setAttribute("aria-hidden", "true");
    }

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

      swimmers.forEach(s => {
        res[s.id] = { first: s.first_name, last: s.last_name, att: 0, pos: 0 };
      });

      const allAttendance = Object.entries(attendance);
      for (const [date, termData] of allAttendance) {
        const d = new Date(date);
        d.setHours(0,0,0,0);
        if (d >= monthStart && d <= monthEnd) {
          for (const termId in termData) {
            for (const swimmerId in termData[termId]) {
              if (termData[termId][swimmerId] === true && res[swimmerId]) {
                res[swimmerId].att++;
              }
              if (res[swimmerId]) {
                  res[swimmerId].pos++;
              }
            }
          }
        }
      }
      return Object.values(res);
    }
    
    // ===== NOV MODAL: UREJANJE TERMINA =====
    let editTermModalCtx = { termId: null };
    function openEditTermModal(termId) {
      editTermModalCtx.termId = termId;
      const term = termById(termId);
      if (!term) return;

      elEditTermModalTitle.textContent = `Urejanje termina: ${term.label}`;
      elEditTermDateFrom.value = formatDate(term.date_from);
      elEditTermDateTo.value = formatDate(term.date_to);

      openModal(elEditTermModal);
    }

    function closeEditTermModal() {
      closeModal(elEditTermModal);
    }
    elCloseEditTermModalBtn.addEventListener("click", closeEditTermModal);
    elEditTermModal.addEventListener("click", (e) => {
      if (e.target === elEditTermModal) closeEditTermModal();
    });

    elSaveEditTermBtn.addEventListener("click", async () => {
      const termId = editTermModalCtx.termId;
      if (!termId) return;

      const dateFromStr = elEditTermDateFrom.value;
      const dateToStr = elEditTermDateTo.value;

      const date_from = parseDate(dateFromStr);
      const date_to = parseDate(dateToStr);

      if (!date_from || !date_to) {
        alert("Prosim, vnesite veljavne datume v formatu dd / mm / yyyy.");
        return;
      }
      
      if (date_from > date_to) {
        alert("Začetni datum ne more biti kasnejši od končnega datuma.");
        return;
      }

      const { error } = await supabase
        .from('terms')
        .update({ date_from, date_to })
        .eq('id', termId);

      if (error) {
        console.error('Napaka pri posodabljanju termina:', error);
        alert('Napaka pri posodabljanju termina. Preverite konzolo.');
      } else {
        await fetchData();
        closeEditTermModal();
        renderTerms();
        renderMonth();
        alert('Termin uspešno posodobljen.');
      }
    });


    function renderSummary(data){
      elSummaryBox.innerHTML = "";
      data.sort((a,b)=> (a.last+a.first).localeCompare(b.last+b.first)).forEach(s=>{
        const p=document.createElement("p");
        p.textContent = `${s.first} ${s.last}: ${s.att} / ${s.pos} (${s.pos > 0 ? (s.att/s.pos*100).toFixed(0) : 0}%)`;
        elSummaryBox.appendChild(p);
      });
    }

    // ===== Upravljanje plavalcev =====
    async function addSwimmer(){
      const first = elNewFirst.value.trim();
      const last = elNewLast.value.trim();
      if(!first || !last){ alert("Vnesite ime in priimek."); return; }
      
      const { data, error } = await supabase
        .from('swimmers')
        .insert([{ first_name:first, last_name:last }])
        .select();

      if(error){ console.error("Napaka pri dodajanju plavalca:",error); } 
      else {
        swimmers.push(data[0]);
        refreshSwimmerPanel();
        elNewFirst.value=""; elNewLast.value="";
      }
    }
    elAddSwimmerBtn.addEventListener("click",addSwimmer);
    elNewFirst.addEventListener("keypress", (e) => { if(e.key==="Enter") addSwimmer(); });
    elNewLast.addEventListener("keypress", (e) => { if(e.key==="Enter") addSwimmer(); });

    async function assignTermToSwimmer(){
      const swimmerId = elSwimmerSelect.value;
      const termId = elTermSelect.value;
      if(!swimmerId || !termId){ alert("Izberite plavalca in termin."); return; }
      
      const swimmer = swimmers.find(s=>s.id===swimmerId);
      if(swimmer && !swimmer.terms.includes(termId)){
        swimmer.terms.push(termId);
        const { error } = await supabase
          .from('swimmers')
          .update({ terms: swimmer.terms })
          .eq('id', swimmerId);
        
        if(error) { console.error("Napaka pri dodeljevanju termina:", error); } 
        else { refreshSwimmerPanel(); }
      }
    }
    elAssignTermBtn.addEventListener("click", assignTermToSwimmer);

    async function deleteSwimmer(){
      const swimmerId = elSwimmerSelect.value;
      if(!swimmerId){ alert("Izberite plavalca za brisanje."); return; }
      
      const swimmer = swimmers.find(s=>s.id===swimmerId);
      if(!swimmer) return;
      
      if(confirm(`Ali ste prepričani, da želite arhivirati plavalca ${swimmer.first_name} ${swimmer.last_name}?`)){
        const { error } = await supabase
          .from('swimmers')
          .update({ is_deleted: true })
          .eq('id', swimmerId);
        
        if(error) { console.error("Napaka pri arhiviranju plavalca:", error); } 
        else {
          swimmer.is_deleted = true;
          refreshSwimmerPanel();
          renderMonth();
        }
      }
    }
    elDeleteSwimmerBtn.addEventListener("click", deleteSwimmer);

    function refreshSwimmerPanel(){
      const activeSwimmers = swimmers.filter(s=>!s.is_deleted).sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
      const deletedSwimmers = swimmers.filter(s=>s.is_deleted).sort((a,b)=> (a.last_name+a.first_name).localeCompare(b.last_name+b.first_name));
      
      elSwimmerSelect.innerHTML = "";
      if (activeSwimmers.length > 0) {
        activeSwimmers.forEach(s=>{
          const o=document.createElement("option"); o.value=s.id; o.textContent=`${s.first_name} ${s.last_name}`; elSwimmerSelect.appendChild(o);
        });
      } else {
        const o=document.createElement("option"); o.textContent="Ni plavalcev"; o.disabled=true; elSwimmerSelect.appendChild(o);
      }
      
      elModalSwimmerSelect.innerHTML = "";
      if (activeSwimmers.length > 0) {
        activeSwimmers.forEach(s => {
          const o = document.createElement("option");
          o.value = s.id;
          o.textContent = `${s.first_name} ${s.last_name}`;
          elModalSwimmerSelect.appendChild(o);
        });
      } else {
        const o=document.createElement("option"); o.textContent="Ni plavalcev"; o.disabled=true; elModalSwimmerSelect.appendChild(o);
      }

      elTermSelect.innerHTML = "";
      if (TERMS.length > 0) {
        TERMS.sort((a,b)=>a.label.localeCompare(b.label)).forEach(t=>{
          const o=document.createElement("option"); o.value=t.id; o.textContent=t.label; elTermSelect.appendChild(o);
        });
      } else {
        const o=document.createElement("option"); o.textContent="Ni terminov"; o.disabled=true; elTermSelect.appendChild(o);
      }
      
      elSwimmerInfo.innerHTML = "";
      elSwimmerSelect.addEventListener("change", updateSwimmerInfo);
      updateSwimmerInfo();
    }
    
    function updateSwimmerInfo(){
      const swimmerId = elSwimmerSelect.value;
      const swimmer = swimmers.find(s=>s.id===swimmerId);
      if(!swimmer) { elSwimmerInfo.innerHTML=""; return; }
      
      elSwimmerInfo.innerHTML = `<h4>Dodeljeni termini:</h4>`;
      if (swimmer.terms.length === 0) {
        const p = document.createElement("p");
        p.className = "muted";
        p.textContent = "Plavalec nima dodeljenih terminov.";
        elSwimmerInfo.appendChild(p);
      } else {
        const ul = document.createElement("ul");
        swimmer.terms.forEach(termId => {
          const term = termById(termId);
          if (term) {
            const li = document.createElement("li");
            li.textContent = `${term.label}`;
            const btnRemove = document.createElement("button");
            btnRemove.textContent = "Odstrani";
            btnRemove.className = "btn warn-btn btn-small";
            btnRemove.addEventListener("click", async () => {
              if (confirm(`Ali ste prepričani, da želite odstraniti termin '${term.label}' od plavalca ${swimmer.first_name} ${swimmer.last_name}?`)) {
                swimmer.terms = swimmer.terms.filter(t => t !== termId);
                const { error } = await supabase
                  .from('swimmers')
                  .update({ terms: swimmer.terms })
                  .eq('id', swimmerId);
                if (error) {
                  console.error("Napaka pri odstranjevanju termina:", error);
                  alert("Napaka pri odstranjevanju termina. Preverite konzolo.");
                } else {
                  refreshSwimmerPanel();
                }
              }
            });
            li.appendChild(btnRemove);
            ul.appendChild(li);
          }
        });
        elSwimmerInfo.appendChild(ul);
      }
    }
    
    // ===== Uvoz CSV =====
    elCsvInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        
        let swimmersToAdd = [];
        lines.forEach(line => {
          const [first_name, last_name] = line.split(',').map(s => s.trim());
          if (first_name && last_name) {
            swimmersToAdd.push({ first_name, last_name });
          }
        });

        if (swimmersToAdd.length > 0) {
          const { data, error } = await supabase
            .from('swimmers')
            .insert(swimmersToAdd)
            .select();
          
          if (error) {
            console.error("Napaka pri uvažanju plavalcev:", error);
            alert("Napaka pri uvažanju plavalcev. Preverite konzolo.");
          } else {
            swimmers.push(...data);
            refreshSwimmerPanel();
            alert(`Uspešno uvoženih ${data.length} plavalcev.`);
            elCsvInput.value = "";
          }
        }
      };
      reader.readAsText(file);
    });
    
    // ===== Uvoz CSV terminov =====
    elCsvTermsInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');

        let termsToAdd = [];
        lines.forEach(line => {
          const [label, day, start, end, date_from, date_to] = line.split(',').map(s => s.trim());
          if (label && day && start && end && date_from && date_to) {
            const weekday = DAY_SHORT_MAP[day.toLowerCase()];
            const parsedDateFrom = parseDate(date_from);
            const parsedDateTo = parseDate(date_to);

            if (weekday && parsedDateFrom && parsedDateTo) {
              termsToAdd.push({
                label,
                day: weekday,
                start_time: start,
                end_time: end,
                date_from: parsedDateFrom,
                date_to: parsedDateTo
              });
            }
          }
        });
        
        if (termsToAdd.length > 0) {
          const { data, error } = await supabase
            .from('terms')
            .insert(termsToAdd)
            .select();
          
          if (error) {
            console.error("Napaka pri uvažanju terminov:", error);
            alert("Napaka pri uvažanju terminov. Preverite konzolo.");
          } else {
            TERMS.push(...data);
            renderTerms();
            renderMonth();
            alert(`Uspešno uvoženih ${data.length} terminov.`);
            elCsvTermsInput.value = "";
          }
        }
      };
      reader.readAsText(file);
    });
    
    // ===== Izvoz CSV =====
    function populateExportSelects() {
      const currentYear = new Date().getFullYear();
      elExportYearSelect.innerHTML = "";
      for (let y = currentYear - 2; y <= currentYear + 2; y++) {
        const o = document.createElement("option"); o.value = y; o.textContent = y; elExportYearSelect.appendChild(o);
      }
      elExportYearSelect.value = currentYear;
      
      const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
      elExportMonthSelect.innerHTML = "";
      monthNames.forEach((name, i) => {
        const o = document.createElement("option"); o.value = i; o.textContent = name; elExportMonthSelect.appendChild(o);
      });
      elExportMonthSelect.value = new Date().getMonth();
    }
    
    function getMonthName(month) {
        const monthNames = ["Januar", "Februar", "Marec", "April", "Maj", "Junij", "Julij", "Avgust", "September", "Oktober", "November", "December"];
        return monthNames[month];
    }
    
    elExportCsvBtn.addEventListener("click", async () => {
      const month = parseInt(elExportMonthSelect.value);
      const year = parseInt(elExportYearSelect.value);
      
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      
      const { data: attData, error: attError } = await supabase
        .from('attendance')
        .select('date, swimmer_id, status, terms(id, label, start_time, end_time)')
        .gte('date', iso(monthStart))
        .lte('date', iso(monthEnd));
      
      if (attError) {
          console.error('Napaka pri pridobivanju podatkov za izvoz:', attError);
          alert('Napaka pri izvozu. Preverite konzolo.');
          return;
      }
      
      const header = ["Datum", "Plavalec", "Termin", "Prisotnost"];
      let csvRows = [header.join(";")];
      
      attData.forEach(row => {
        const swimmer = swimmers.find(s => s.id === row.swimmer_id);
        if (!swimmer) return;
        
        const date = formatDate(row.date);
        const name = `${swimmer.first_name} ${swimmer.last_name}`;
        const termLabel = row.terms.label;
        const status = row.status ? "Prisoten" : "Odsoten";
        
        csvRows.push([date, name, termLabel, status].join(";"));
      });
      
      const csvString = csvRows.join("\n");
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      if (link.download !== undefined) {
          const url = URL.createObjectURL(blob);
          link.setAttribute("href", url);
          link.setAttribute("download", `prisotnost_${getMonthName(month)}_${year}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
    });

    // ===== Upravljanje terminov =====
    async function addTerm(){
      const dayStr = elNewTermDay.value;
      const start = elNewTermStart.value;
      const end = elNewTermEnd.value;
      const dateFromStr = elNewTermDateFrom.value;
      const dateToStr = elNewTermDateTo.value;
      
      if(!dayStr || !start || !end || !dateFromStr || !dateToStr) {
        alert("Prosim, izpolnite vsa polja za nov termin.");
        return;
      }
      
      const day = parseInt(dayStr);
      const date_from = parseDate(dateFromStr);
      const date_to = parseDate(dateToStr);
      
      if (!date_from || !date_to) {
        alert("Prosim, vnesite veljavne datume v formatu dd / mm / yyyy.");
        return;
      }

      if (date_from > date_to) {
        alert("Začetni datum ne more biti kasnejši od končnega datuma.");
        return;
      }
      
      const label = `${DAYNAME[day]} od ${start} do ${end}`;
      
      const { data, error } = await supabase
        .from('terms')
        .insert([{ label, day, start_time: start, end_time: end, date_from, date_to }])
        .select();

      if(error){
        console.error("Napaka pri dodajanju termina:", error);
      } else {
        TERMS.push(data[0]);
        renderTerms();
        renderMonth();
        elNewTermDateFrom.value = "";
        elNewTermDateTo.value = "";
        alert(`Uspešno dodan nov termin: ${label}`);
      }
    }
    elAddTermBtn.addEventListener("click", addTerm);
    
    function renderTerms(){
      elTermList.innerHTML = "";
      TERMS.sort((a,b)=> a.day-b.day || a.start_time.localeCompare(b.start_time)).forEach(t=>{
        const div=document.createElement("div"); div.className="term-item";
        const info = document.createElement("div"); info.className = "term-item-info";
        const label = document.createElement("span"); label.className="term-item-label"; label.textContent=`${t.label}`;
        const dates = document.createElement("span"); dates.className="term-item-dates"; dates.textContent=`${formatDate(t.date_from)} - ${formatDate(t.date_to)}`;
        
        const btnDelete = document.createElement("button");
        btnDelete.textContent="Izbriši"; btnDelete.className="btn warn-btn btn-small";
        btnDelete.addEventListener("click", async()=>{
          if(confirm(`Ali ste prepričani, da želite izbrisati termin '${t.label}'?`)){
            const { error } = await supabase.from('terms').delete().eq('id',t.id);
            if(error){ console.error("Napaka pri brisanju termina:",error); }
            else { 
              TERMS = TERMS.filter(term=>term.id!==t.id);
              renderTerms();
              renderMonth();
              alert(`Termin '${t.label}' je bil uspešno izbrisan.`);
            }
          }
        });
        
        const btnEdit = document.createElement("button");
        btnEdit.textContent = "Uredi";
        btnEdit.className = "btn neutral-btn btn-small";
        btnEdit.addEventListener("click", () => {
          openEditTermModal(t.id);
        });

        info.appendChild(label);
        info.appendChild(dates);
        div.appendChild(info);
        div.appendChild(btnEdit);
        div.appendChild(btnDelete);
        elTermList.appendChild(div);
      });
      refreshSwimmerPanel();
    }
    
    // ===== Glavna inicializacija =====
    async function fetchData(){
      try{
        const { data: termsData, error: termsError } = await supabase.from('terms').select('*');
        if (termsError) throw termsError;
        TERMS = termsData;
        
        const { data: swimmersData, error: swimmersError } = await supabase.from('swimmers').select('*');
        if (swimmersError) throw swimmersError;
        swimmers = swimmersData;
        
        const { data: attendanceData, error: attendanceError } = await supabase.from('attendance').select('*');
        if (attendanceError) throw attendanceError;
        attendance = attendanceData.reduce((acc, row) => {
          acc[row.date] = acc[row.date] || {};
          acc[row.date][row.term_id] = acc[row.date][row.term_id] || {};
          acc[row.date][row.term_id][row.swimmer_id] = row.status;
          return acc;
        }, {});
        
        const { data: statusData, error: statusError } = await supabase.from('term_status').select('date, term_id, status, note, notes');
        if (statusError) throw statusError;
        termStatus = statusData.reduce((acc, row) => {
          acc[row.date] = acc[row.date] || {};
          acc[row.date][row.term_id] = { status: row.status, note: row.note, notes: row.notes };
          return acc;
        }, {});

        populateExportSelects();
        refreshSwimmerPanel();
        renderTerms();
        renderMonth();

      } catch (error) {
        console.error("Napaka pri nalaganju podatkov:", error.message);
      }
    }
    
    // Dodajanje dogodkov na gumbe za navigacijo po mesecih
    elPrev.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()-1); renderMonth(); });
    elNext.addEventListener("click", ()=>{ viewDate.setMonth(viewDate.getMonth()+1); renderMonth(); });

    fetchData();
});